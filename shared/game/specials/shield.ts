import { vec2 } from "gl-matrix";
import Special, { SerializableSpecial } from "./special";
import Ship, { CollisionEventContext, OnOffEventContext } from "../ship";
import { BoundingBoxColliderResult, CircleColliderResult } from "star-engine";
import CollidableGameBaseObject from "../collidableGameBaseObject";
import Bullet from "../bullet";

export interface SerializableShield extends SerializableSpecial {
  on: boolean;
  status: number;
}

export default class Shield extends Special {
  _on: boolean = false;
  _status: number = 100;

  constructor(owner: Ship, power: number) {
    super(owner, power);
    this.type = "shield";

    this.owner.on("fire", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && this._on;
    });
    this.owner.on("thrust", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && this._on;
    });
    this.owner.on("collided", (ship: Ship, context: CollisionEventContext) => {
      context.cancel = this._on;
      if (context.cancel) {
        let e = 0;
        const cOtherObj = context.otherObj as CircleColliderResult;
        if (typeof cOtherObj.radius === "number") {
          if (cOtherObj.owner instanceof Bullet) {
            e = 500;
          } else {
            const cOther = cOtherObj.owner as CollidableGameBaseObject;
            e =
              0.5 * vec2.dot(cOtherObj.velocity, cOtherObj.normal) * cOther.mass +
              0.5 * vec2.dot(context.thisObj.velocity, context.thisObj.normal) * owner.mass;
          }
        } else {
          e = 0.5 * vec2.dot(context.thisObj.velocity, context.thisObj.normal) * owner.mass;
        }

        this._status = Math.max(0, this._status - Math.abs(e) / this.power);
      }
    });
  }

  on() {
    // Must recharge at least 20% to turn on again.
    if (this._status >= 20) {
      this._on = true;
      // Stop firing
      this.owner.fire(false);
      // Stop thrusting
      this.owner.thrust(false);
    }
  }

  off() {
    this._on = false;
  }

  update(tDelta: number) {
    if (this._on) {
      this._status = Math.max(0, this._status - (tDelta * 1900) / (26 + this.power * 2));
      if (this._status == 0) {
        this._on = false;
      }
    } else {
      this._status = Math.min(100, this._status + (tDelta * 950) / (226 - this.power * 2));
    }
  }

  serialize(): SerializableShield {
    const obj = super.serialize();
    return {
      ...obj,
      on: this._on,
      status: this._status
    };
  }

  deserialize(obj: SerializableShield) {
    super.deserialize(obj);

    this._on = obj.on;
    this._status = obj.status;
  }
}
