import { Camera, RefreshTime } from "star-engine";
import Ship from "../ship";

export type SpecialType = "none" | "warp" | "shield" | "grav" | "antigrav" | "missile" | "cloak";

export interface SerializableSpecial {
  type: SpecialType;
  power: number;
}

export default class Special {
  type: SpecialType = "none";
  owner: Ship;
  power: number = 50;

  constructor(owner: Ship, power: number) {
    this.owner = owner;
    this.power = power;
  }

  on() {}

  off() {}

  draw?(camera: Camera, time: RefreshTime): void;
  update(tDelta: number) {}

  serialize(): SerializableSpecial {
    return {
      type: this.type,
      power: this.power
    };
  }

  deserialize(obj: SerializableSpecial) {
    this.type = obj.type;
    this.power = obj.power;
  }
}
