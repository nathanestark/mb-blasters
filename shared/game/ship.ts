import { vec2, vec3, quat } from "gl-matrix";
import { EventEmitter, CircleColliderResult, ColliderResult, RefreshTime } from "star-engine";
import CollidableGameBaseObject, {
  CollidableGameBaseObjectProperties,
  SerializedCollidableGameBaseObject,
  HitContext,
  CollidableGameBaseObjectEventTypes
} from "./collidableGameBaseObject";
import { NetworkObject, setPreviousState } from "./network";
import Player from "./player";
import Bullet from "./bullet";
import {
  Special,
  SpecialType,
  SerializedSpecial,
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

export interface ShipEventTypes extends CollidableGameBaseObjectEventTypes {
  destroying: [obj: Ship];
  destroyed: [obj: Ship];
  networkChange: [obj: Ship];

  fire: [obj: Ship, context: OnOffEventContext];
  thrust: [obj: Ship, context: OnOffEventContext];
  rotateCounterClockwise: [obj: Ship, context: OnOffEventContext];
  rotateClockwise: [obj: Ship, context: OnOffEventContext];
  special: [obj: Ship, context: OnOffEventContext];
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
  _color: string;
  _thrust: number;
  _rotate: number;
  _firing: boolean;
  owner: number;
  _destroying: boolean;

  _shipType: ShipType;
  _special: SerializedSpecial;
  _bulletSpeed: number;
  _maxThrust: number;
  _maxRotate: number;
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

export default class Ship extends CollidableGameBaseObject implements EventEmitter<ShipEventTypes> {
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

    this.addSerializableProperty("_color");
    this.addSerializableProperty("_thrust", {
      deserialize: (sValue: number) => {
        this.thrust(sValue > 0);
        this._thrust = sValue;
      }
    });
    this.addSerializableProperty("_rotate");
    this.addSerializableProperty("_firing");
    this.addSerializableProperty("owner", {
      serialize: (value: Player) => value.id,
      deserialize: (sValue: number) => {
        if (this.active) this.owner = this.game.getGameObject(sValue) as Player;
      },
      equals: (a: Player, b: Player) => a.id == b.id
    });
    this.addSerializableProperty("_destroying", {
      deserialize: (sValue: boolean) => {
        if (!this._destroying && sValue) {
          this.destroy();
        }
        this._destroying = sValue;
      }
    });

    this.addSerializableProperty("_type", { serializedName: "_shipType" });
    this.addSerializableProperty("_special", {
      init: () => {
        return {};
      },
      copy: (to: Record<string, any>, from: Special) => {
        setPreviousState(from.serializable, to, from);
      },
      serialize: (value: Special, changesOnly: boolean) => {
        return value.serialize(this._previousState["_special"] as Record<string, any>, changesOnly);
      },
      deserialize: (sValue: SerializedSpecial) => {
        if (typeof sValue.type !== "undefined" && this._special.type != sValue.type) {
          this._special = this.createSpecial(sValue.type, 0);
        }
        this._special.deserialize(sValue);
      },
      equals: (a: Record<string, any>, b: Special) => {
        return b.equals(a);
      }
    });
    this.addSerializableProperty("_bulletSpeed");
    this.addSerializableProperty("_maxThrust");
    this.addSerializableProperty("_maxRotate");
  }

  protected emit<K extends keyof ShipEventTypes>(event: K, ...args: ShipEventTypes[K]): boolean {
    const ret = super.emit(event, ...args);
    if (!["collided"].includes(event as string)) {
      super.emit("networkChange", this);
    }
    return ret;
  }

  requestUpdate?(): void;

  destroy() {
    if (this._destroying) return;

    this._destroying = true;
    this._firing = false;
    this._thrust = 0;
    this._rotate = 0;
    this._special.off();
    this._collider.canCollide = false;
    this.emit("destroying", this);

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

  onHit(target: CollidableGameBaseObject, context: HitContext): void {
    super.onHit(target, context);

    if (!context.canceled) this.destroy();
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    // Nothing happens if it is our bullet.
    if (otherObj.owner instanceof Bullet && otherObj.owner.owner == this) {
      thisObj.canceled = true;
    }

    // If we're destroyed, we can't collide anymore either.
    if (this._destroying) {
      thisObj.canceled = true;
    }
  }

  createSpecial(type: SpecialType, power: number): Special {
    if (type == "shield") return new Shield(this, power);
    else if (type == "warp") return new Warp(this, power);
    else if (type == "grav") return new Grav(this, power);
    else if (type == "antigrav") return new Grav(this, power, -1);
    return new None(this, power);
  }

  serialize(changesOnly = false): SerializedShip | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;

    return {
      ...sObj,
      type: "Ship"
    } as SerializedShip;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Ship") throw "Type mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
