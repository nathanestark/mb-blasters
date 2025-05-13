import { EventEmitter } from "events";
import { vec2, vec3, quat } from "gl-matrix";
import { CircleColliderResult, ColliderResult, RefreshTime } from "star-engine";
import CollidableGameBaseObject, {
  CollidableGameBaseObjectProperties,
  SerializedCollidableGameBaseObject
} from "./collidableGameBaseObject";
import { NetworkObject } from "./network";
import Player from "./player";
import Bullet from "./bullet";
import {
  Special,
  SpecialType,
  SerializableSpecial,
  None,
  Shield,
  Warp,
  Grav
} from "./specials/index";

export type ShipType = "deltaship" | "sweepship" | "bustership";

export interface ShipEventContext {
  cancel: boolean;
}

export interface OnOffEventContext extends ShipEventContext {
  on: boolean;
}

export interface CollisionEventContext extends ShipEventContext {
  thisObj: CircleColliderResult;
  otherObj: ColliderResult;
}

export const DESTROY_TIME = 1000;
export interface ShipConfiguration {
  type: ShipType;
  special: SpecialType;
  bulletSpeed: number;
  maxThrust: number;
  maxRotate: number;
  maxSpeed: number;
  specialPower: number;
}

export interface SerializedShip extends SerializedCollidableGameBaseObject {
  color: string;
  thrust: number;
  rotate: number;
  firing: boolean;
  owner: number;
  destroying: boolean;

  shipType: ShipType;
  special: SerializableSpecial;
  bulletSpeed: number;
  maxThrust: number;
  maxRotate: number;
}

export interface ShipProperties extends CollidableGameBaseObjectProperties {
  color?: string;
  type?: ShipType;
  special?: SpecialType;
  bulletSpeed?: number;
  maxThrust?: number;
  maxRotate?: number;
  maxSpeed?: number;
  specialPower?: number;
}

export default class Ship extends CollidableGameBaseObject {
  owner: Player;

  _color: string = "#F00";
  _type: ShipType = "bustership";
  _special: Special;
  _thrust: number = 0;
  _rotate: number = 0;
  _firing: boolean = false;
  _fireRecord: number = 0;
  _destroying: boolean = false;

  _bulletSpeed: number = 500;
  _maxThrust: number = 3000;
  _maxRotate: number = 0.04;
  maxSpeed: number = 600;

  _emitter = new EventEmitter();

  constructor(
    owner: Player,
    {
      color,
      type,
      special,
      bulletSpeed,
      maxThrust,
      maxRotate,
      maxSpeed,
      specialPower,
      ...superProps
    }: ShipProperties = {}
  ) {
    super({
      ...{
        mass: 10,
        radius: 32,
        rotation: 0
      },
      ...superProps
    });
    this.classTags.push("ship");

    this.owner = owner;

    if (color) this._color = color;
    if (type) this._type = type;
    if (bulletSpeed) this._bulletSpeed = bulletSpeed;
    if (maxThrust) this._maxThrust = maxThrust;
    if (maxRotate) this._maxRotate = maxRotate;
    if (maxSpeed) this.maxSpeed = maxSpeed;
    this._special = this.createSpecial(
      special || "none",
      typeof specialPower === "undefined" ? 50 : specialPower
    );
  }

  on<T extends ShipEventContext>(
    event:
      | "destroying"
      | "destroyed"
      | "fire"
      | "thrust"
      | "rotateCounterClockwise"
      | "rotateClockwise"
      | "special"
      | "collision"
      | "collided"
      | "networkChange",
    listener: (ship: Ship, context: T) => void
  ) {
    this._emitter.on(event, listener);
  }
  off<T extends ShipEventContext>(
    event:
      | "destroying"
      | "destroyed"
      | "fire"
      | "thrust"
      | "rotateCounterClockwise"
      | "rotateClockwise"
      | "special"
      | "collision"
      | "networkChange",
    listener: (ship: Ship, context: T) => void
  ) {
    this._emitter.off(event, listener);
  }
  once<T extends ShipEventContext>(
    event:
      | "destroying"
      | "destroyed"
      | "fire"
      | "thrust"
      | "rotateCounterClockwise"
      | "rotateClockwise"
      | "special"
      | "collision"
      | "networkChange",
    listener: (ship: Ship, context: T) => void
  ) {
    this._emitter.once(event, listener);
  }
  private emit(event: string, ...args: Array<any>) {
    // What if one of the args is a context that can be canceled?
    // No sense in sending an update out if it was canceled.
    this._emitter.emit(event, ...args);
    this._emitter.emit("networkChange", this);
  }

  destroy() {
    if (this._destroying) return;

    this.emit("destroying", this);
    this._destroying = true;
    this._firing = false;
    this._thrust = 0;
    this._rotate = 0;
    this._special.off();
    this._collider.canCollide = false;

    setTimeout(() => this.destroyed(), DESTROY_TIME);
  }

  destroyed() {
    if (this.removed) return;

    this.removed = true;
    if (this.game) this.game.removeGameObject(this);
    this.emit("destroyed", this);
  }

  fire(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("fire", this, context);
    if (!context.cancel) this._firing = on;
  }

  thrust(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("thrust", this, context);
    if (!context.cancel) this._thrust = on ? this._maxThrust : 0;
  }

  rotateCounterClockwise(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("rotateCounterClockwise", this, context);
    if (!context.cancel) this._rotate = on ? -this._maxRotate : 0;
  }

  rotateClockwise(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("rotateClockwise", this, context);
    if (!context.cancel) this._rotate = on ? this._maxRotate : 0;
  }

  special(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("special", this, context);
    if (!context.cancel) {
      if (on) {
        this._special.on();
      } else {
        this._special.off();
      }
    }
  }

  update(time: RefreshTime) {
    this._special.update(time);

    // Add our rotation
    this.rotation += this._rotate;

    // Add our thrust to force.
    if (this._thrust != 0) {
      // Determine what direction we're facing.

      const temp = vec3.fromValues(this._thrust, 0, 0);
      const rotQuat = quat.identity(quat.create());
      quat.rotateZ(rotQuat, rotQuat, this.rotation);
      vec3.transformQuat(temp, temp, rotQuat);

      vec2.add(this.totalForce, this.totalForce, vec2.fromValues(temp[0], temp[1]));
    }

    super.update(time);
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    // Nothing happens if it is our bullet.
    const myBullet = otherObj.owner instanceof Bullet && otherObj.owner.owner == this;
    if (otherObj.owner instanceof CollidableGameBaseObject && myBullet) {
      thisObj.canceled = true;
      return;
    }

    // Handle natural collision (updating velocity, etc)
    super.onCollision(thisObj, otherObj);

    const context = { thisObj, otherObj, cancel: false };
    this.emit("collision", this, context);

    if (!context.cancel && otherObj.owner instanceof CollidableGameBaseObject) {
      // Any collision destroys our ship.
      this.destroy();
    }
  }

  onCollided(thisObj: CircleColliderResult, otherObj: ColliderResult) {
    const context = { thisObj, otherObj, cancel: false };
    this.emit("collided", this, context);

    // If we're destroyed, don't adjust overlap.
    if (this._destroying) return;

    super.onCollided(thisObj, otherObj);
  }

  createSpecial(type: SpecialType, power: number): Special {
    if (type == "shield") return new Shield(this, power);
    else if (type == "warp") return new Warp(this, power);
    else if (type == "grav") return new Grav(this, power);
    else if (type == "antigrav") return new Grav(this, power, -1);
    return new None(this, power);
  }

  serialize(): SerializedShip | null {
    const sObj = super.serialize();
    if (!sObj) return null;

    return {
      ...sObj,
      type: "Ship",
      shipType: this._type,
      special: this._special.serialize(),

      owner: this.owner.id,
      color: this._color,
      thrust: this._thrust,
      rotate: this._rotate,
      firing: this._firing,
      destroying: this._destroying,

      bulletSpeed: this._bulletSpeed,
      maxThrust: this._maxThrust,
      maxRotate: this._maxRotate
    };
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Ship") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedShip;

    super.deserialize(obj, initialize);

    this._type = pObj.shipType;
    if (this._special.type != pObj.special.type) {
      this._special = this.createSpecial(pObj.special.type, 0);
    }
    this._special.deserialize(pObj.special);

    if (this.active) this.owner = this.game.getGameObject(pObj.owner) as Player;
    this._color = pObj.color;
    this.thrust(pObj.thrust > 0);
    this._thrust = pObj.thrust;
    this._rotate = pObj.rotate;
    this._firing = pObj.firing;
    if (!this._destroying && pObj.destroying) {
      this.destroy();
    }
    this._destroying = pObj.destroying;

    this._bulletSpeed = pObj.bulletSpeed;
    this._maxThrust = pObj.maxThrust;
    this._maxRotate = pObj.maxRotate;
  }
}
