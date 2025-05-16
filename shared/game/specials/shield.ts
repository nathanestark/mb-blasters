import { vec2 } from "gl-matrix";
import Special, { SerializedSpecial } from "./special";
import Ship, { CollisionEventContext, OnOffEventContext } from "../ship";
import { BoundingBoxColliderResult, CircleColliderResult, RefreshTime } from "star-engine";
import CollidableGameBaseObject, { HitContext } from "../collidableGameBaseObject";
import Bullet from "../bullet";

export interface SerializableShield extends SerializedSpecial {
  _on: boolean;
  _status: number;
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
    this.owner.on("hit", (ship: Ship, target: CollidableGameBaseObject, context: HitContext) => {
      context.canceled = this._on;
      if (context.canceled) {
        let e = 0;
        if (target instanceof Bullet) {
          e = 500;
        } else {
          e =
            0.5 * vec2.dot(context.targetObj.velocity, context.targetObj.normal) * target.mass +
            0.5 * vec2.dot(context.thisObj.velocity, context.thisObj.normal) * owner.mass;
        }

        this._status = Math.max(0, this._status - Math.abs(e) / this.power);
      }
    });

    this.addSerializableProperty("_on", {
      deserialize: (sValue: boolean) => {
        if (sValue != this._on) {
          if (sValue) this.on();
          else this.off();
        }
        this._on = sValue;
      }
    });
    this.addSerializableProperty("_status");
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

  update(time: RefreshTime) {
    if (this._on) {
      this._status = Math.max(0, this._status - (time.timeAdvance * 1900) / (26 + this.power * 2));
      if (this._status == 0) {
        this._on = false;
      }
    } else {
      this._status = Math.min(
        100,
        this._status + (time.timeAdvance * 950) / (226 - this.power * 2)
      );
    }
  }
}
