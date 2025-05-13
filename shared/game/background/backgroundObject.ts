import { vec2 } from "gl-matrix";
import { GameObject, RefreshTime } from "star-engine";
import {
  NetworkObject,
  SerializedVec2,
  NetworkSerializable,
  NetworkDeserializable,
  serializeVec2,
  deserializeVec2
} from "../network";

export interface SerializedBackgroundObject extends NetworkObject {
  position: SerializedVec2;
  velocity: SerializedVec2;
  rotation: number;
  repeat: boolean | "x" | "y";
  depth: number;
}

export interface BackgroundObjectProperties {
  position?: vec2;
  velocity?: vec2;
  rotation?: number;
  repeat?: boolean | "x" | "y";
  depth?: number;
}

export default class BackgroundObject
  extends GameObject
  implements NetworkSerializable, NetworkDeserializable
{
  position: vec2 = vec2.create();
  velocity: vec2 = vec2.create();
  rotation: number = 0;
  repeat: boolean | "x" | "y" = false;
  depth: number = 1; // 0 to 1, where 1 is infinitely far away.

  serverTargetLastUpdateTime: number = 0;

  classTags: Array<string> = [];

  constructor({ position, velocity, rotation, repeat, depth }: BackgroundObjectProperties = {}) {
    super();

    this.classTags = ["gamebase", "network"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation === "number") this.rotation = rotation;
    if (typeof repeat !== "undefined") this.repeat = repeat;
    if (typeof depth === "number") this.depth = depth;
  }

  update(time: RefreshTime) {
    if (vec2.sqrLen(this.velocity) > 0) {
      // Apply our velocity to our position, but don't destroy velocity.
      const vel = vec2.clone(this.velocity);
      vec2.scale(vel, vel, time.timeAdvance);
      vec2.add(this.position, this.position, vel);
    }
  }

  serialize(): SerializedBackgroundObject | null {
    return {
      type: "BackgroundObject", // Should get overwritten
      id: this.id,

      position: serializeVec2(this.position),
      velocity: serializeVec2(this.velocity),
      rotation: this.rotation,
      repeat: this.repeat,
      depth: this.depth
    };
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    const pObj = obj as SerializedBackgroundObject;

    deserializeVec2(this.position, pObj.position);
    deserializeVec2(this.velocity, pObj.velocity);
    this.rotation = pObj.rotation;
    this.repeat = pObj.repeat;
    this.depth = pObj.depth;
  }
}
