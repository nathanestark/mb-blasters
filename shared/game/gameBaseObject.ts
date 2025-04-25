import { vec2 } from "gl-matrix";
import { Math2D, GameObject2D, GameObject } from "star-engine";
import {
  NetworkObject,
  SerializedVec2,
  NetworkSerializable,
  NetworkDeserializable,
  serializeVec2,
  deserializeVec2
} from "./network";

export interface SerializedGameBaseObject extends NetworkObject {
  position: SerializedVec2;
  velocity: SerializedVec2;
  totalForce: SerializedVec2;
  rotation: number;
  radius: number;
  mass: number;
  minSpeed: number;
  maxSpeed?: number;
}

export interface GameBaseObjectProperties {
  position?: vec2;
  velocity?: vec2;
  rotation?: number;
  radius?: number;
  mass?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

export default class GameBaseObject
  extends GameObject
  implements GameObject2D, NetworkSerializable, NetworkDeserializable
{
  position: vec2 = vec2.create();
  velocity: vec2 = vec2.create();
  totalForce: vec2 = vec2.create();
  rotation: number = 0;
  radius: number = 1;
  mass: number = 1;
  minSpeed: number = 0.1;
  maxSpeed?: number;
  removed: boolean = false;

  classTags: Array<string> = [];

  constructor({
    position,
    velocity,
    rotation,
    radius,
    mass,
    minSpeed,
    maxSpeed
  }: GameBaseObjectProperties = {}) {
    super();

    this.classTags = ["gamebase", "network"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation == "number") this.rotation = rotation;
    if (typeof radius == "number") this.radius = radius;
    if (typeof mass == "number") this.mass = mass;
    if (typeof minSpeed == "number") this.minSpeed = minSpeed;
    if (typeof maxSpeed == "number") this.maxSpeed = maxSpeed;
  }

  update(tDelta: number) {
    // Apply our total force to our velocity.
    if (this.mass > 0) {
      vec2.scale(this.totalForce, this.totalForce, tDelta / this.mass);
    }
    vec2.add(this.velocity, this.velocity, this.totalForce);

    let sqrSpeed = vec2.sqrLen(this.velocity);
    // Check if our velocity falls below epsilon.
    if (sqrSpeed <= this.minSpeed * this.minSpeed) {
      vec2.set(this.velocity, 0, 0);
      sqrSpeed = 0;
    }
    // Or above
    else if (typeof this.maxSpeed !== "undefined" && sqrSpeed > this.maxSpeed * this.maxSpeed) {
      // Cap our speed.
      vec2.scale(this.velocity, vec2.normalize(this.velocity, this.velocity), this.maxSpeed);
    }

    // Apply our velocity to our position, but don't destroy velocity.
    if (sqrSpeed > 0) {
      const vel = vec2.clone(this.velocity);
      vec2.scale(vel, vel, tDelta);
      vec2.add(this.position, this.position, vel);
    }

    // Reset force.
    this.totalForce = vec2.create();
  }

  serialize(): SerializedGameBaseObject | null {
    if (this.removed) return null;
    return {
      type: "GameBaseObject", // Should get overwritten
      id: this.id,

      position: serializeVec2(this.position),
      velocity: serializeVec2(this.velocity),
      totalForce: serializeVec2(this.totalForce),
      rotation: this.rotation,
      radius: this.radius,
      mass: this.mass,
      minSpeed: this.minSpeed,
      maxSpeed: this.maxSpeed
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    // Because this class is inherited, 'type' may be different.
    // if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedGameBaseObject;

    deserializeVec2(this.position, pObj.position);
    deserializeVec2(this.velocity, pObj.velocity);
    deserializeVec2(this.totalForce, pObj.totalForce);
    this.rotation = pObj.rotation;
    this.radius = pObj.radius;
    this.mass = pObj.mass;
    this.minSpeed = pObj.minSpeed;
    this.maxSpeed = pObj.maxSpeed;
  }
}
