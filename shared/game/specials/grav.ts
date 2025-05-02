import { vec2 } from "gl-matrix";
import Special, { SerializableSpecial } from "./special";
import Ship from "../ship";
import GameBaseObject from "../gameBaseObject";

export interface SerializableGrav extends SerializableSpecial {
  on: boolean;
  direction: number;
}

export default class Grav extends Special {
  _on: boolean = false;
  _direction: number = 1;
  _realMass: number = 0;

  constructor(owner: Ship, power: number, direction?: number) {
    super(owner, power);
    this.type = "grav";
    this._direction = typeof direction === "undefined" ? 1 : direction;
  }

  on() {
    this._on = true;
    this._realMass = this.owner.mass;
    this.owner.mass = this.power;
  }

  off() {
    this._on = false;
    this.owner.mass = this._realMass;
  }

  activate?(): void;

  update(_tDelta: number) {
    if (this._on) {
      (this.owner.game.filter("gamebase") as Array<GameBaseObject>).forEach((obj) => {
        if (obj.id == this.owner.id || obj.mass <= 0) return;

        // Create a force pointed towards us.
        const force = vec2.create();
        // Point towards our ship
        vec2.normalize(force, vec2.sub(force, this.owner.position, obj.position));

        // Work up magnitude based on power and distance squared.
        const mag =
          this._direction *
          10000 *
          (((this.power + 10) * obj.mass) / vec2.dist(this.owner.position, obj.position) ** 1.5);

        vec2.scaleAndAdd(obj.totalForce, obj.totalForce, force, mag);
      });
    }
  }

  serialize(): SerializableGrav {
    const obj = super.serialize();
    return {
      ...obj,
      on: this._on,
      direction: this._direction
    };
  }

  deserialize(obj: SerializableGrav) {
    super.deserialize(obj);

    this._direction = obj.direction;

    if (obj.on && !this._on && this.activate) {
      this.activate();
    }
    this._on = obj.on;
  }
}
