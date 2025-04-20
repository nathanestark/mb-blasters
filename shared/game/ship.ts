import { vec2, vec3, quat } from "gl-matrix";
import { CircleColliderResult, ColliderResult } from "star-engine";
import GameBaseObject, {
  GameBaseObjectProperties,
  SerializedGameBaseObject
} from "./gameBaseObject";
import { NetworkObject } from "./network";
import Player from "./player";
import Bullet from "./bullet";

export interface ShipConfiguration {}

export interface SerializedShip extends SerializedGameBaseObject {
  color: string;
  thrust: number;
  rotate: number;
  firing: boolean;
  owner: number;
}

export interface ShipProperties extends GameBaseObjectProperties {
  color?: string;
  onDestroyed?: (obj: Ship) => void;
}

export default class Ship extends GameBaseObject {
  owner: Player;

  _color: string = "#F00";
  _thrust: number = 0;
  _rotate: number = 0;
  _firing: boolean = false;
  _fireRecord: number = 0;
  _onDestroyed?: (obj: Ship) => void;

  constructor(owner: Player, { color, onDestroyed, ...superProps }: ShipProperties = {}) {
    super({
      ...{
        mass: 10,
        radius: 10,
        rotation: 0
      },
      ...superProps
    });
    this.classTags.push("ship");

    this.owner = owner;

    if (color) this._color = this._color;
    if (onDestroyed) this._onDestroyed = onDestroyed;
  }

  onDestroyed() {
    this._firing = false;
    this._thrust = 0;
    this._rotate = 0;

    if (this._onDestroyed) this._onDestroyed(this);
  }

  fire(on: boolean) {
    this._firing = on;
  }

  thrust(on: boolean) {
    this._thrust = on ? 1000 : 0;
  }

  rotateCounterClockwise(on: boolean) {
    this._rotate = on ? -0.06 : 0;
  }

  rotateClockwise(on: boolean) {
    this._rotate = on ? 0.06 : 0;
  }

  update(tDelta: number) {
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

    super.update(tDelta);
  }

  onCollided(thisObj: CircleColliderResult, otherObj: ColliderResult) {
    if (this.removed) return;

    const myBullet = otherObj.owner instanceof Bullet && otherObj.owner.owner == this;
    if (otherObj.owner instanceof GameBaseObject && !myBullet) {
      this.removed = true;
      this.game.removeGameObject(this);
      this.onDestroyed();
    } else {
      super.onCollided(thisObj, otherObj);
    }
  }

  serialize(): SerializedShip {
    return {
      ...super.serialize(),
      type: "Ship",

      owner: this.owner.id,
      color: this._color,
      thrust: this._thrust,
      rotate: this._rotate,
      firing: this._firing
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Ship") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedShip;

    super.deserialize(obj);

    if (this.active) this.owner = this.game.getGameObject(pObj.owner) as Player;
    this._color = pObj.color;
    this.thrust(pObj.thrust > 0);
    this._thrust = pObj.thrust;
    this._rotate = pObj.rotate;
    this._firing = pObj.firing;
  }
}
