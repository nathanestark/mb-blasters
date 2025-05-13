import { vec2 } from "gl-matrix";
import { GameObject2D, GameObject, RefreshTime } from "star-engine";
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

export interface IGameBaseObject {
  position: vec2;
  velocity: vec2;
  totalForce: vec2;
  rotation: number;
  radius: number;
  mass: number;
  minSpeed: number;
  maxSpeed?: number;
  removed: boolean;
}

export default class GameBaseObject
  extends GameObject
  implements GameObject2D, NetworkSerializable, NetworkDeserializable, IGameBaseObject
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

  serverPosition: vec2 = vec2.create();
  serverVelocity: vec2 = vec2.create();
  serverRotation: number = 0;
  serverTargetLastUpdateTime: number = 0;
  serverLerpProgress: number = 0;

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

    this.classTags = ["gamebase", "gamebaseObject", "network"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation == "number") this.rotation = rotation;
    if (typeof radius == "number") this.radius = radius;
    if (typeof mass == "number") this.mass = mass;
    if (typeof minSpeed == "number") this.minSpeed = minSpeed;
    if (typeof maxSpeed == "number") this.maxSpeed = maxSpeed;

    this.serverPosition = vec2.clone(this.position);
    this.serverVelocity = vec2.clone(this.velocity);
    this.serverRotation = this.rotation;
  }

  update(time: RefreshTime) {
    const serverTimeAdvance = (time.curTime - this.serverTargetLastUpdateTime) / 1000;
    const performLerp = this.serverTargetLastUpdateTime > 0 && this.serverLerpProgress < 1;
    if (performLerp) {
      this.serverLerpProgress = Math.min(1, this.serverLerpProgress + time.timeAdvance * 5);
    }

    // Apply our total force to our velocities.
    if (this.mass > 0) {
      vec2.scale(this.totalForce, this.totalForce, time.timeAdvance / this.mass);
    }

    vec2.add(this.velocity, this.velocity, this.totalForce);

    const sqrSpeed = this.clampSpeed(this.velocity);

    // Apply our velocity to our position, but don't destroy velocity.
    let serverPosition = null;
    if (performLerp) {
      serverPosition = vec2.clone(this.serverPosition);
    }

    if (sqrSpeed > 0) {
      const vel = vec2.clone(this.velocity);
      vec2.scale(vel, vel, time.timeAdvance);
      vec2.add(this.position, this.position, vel);

      if (performLerp) {
        vec2.scale(vel, vec2.clone(this.velocity), serverTimeAdvance);
        vec2.add(serverPosition!, serverPosition!, vel);
      }
    }

    // Lerp Position
    if (performLerp) {
      vec2.lerp(this.position, this.position, serverPosition!, this.serverLerpProgress);
    }

    // Reset force.
    this.totalForce = vec2.create();
  }

  private clampSpeed(velocity: vec2) {
    let sqrSpeed = vec2.sqrLen(velocity);
    // Check if our velocity falls below epsilon.
    if (sqrSpeed <= this.minSpeed * this.minSpeed) {
      vec2.set(velocity, 0, 0);
      sqrSpeed = 0;
    }
    // Or above
    else if (typeof this.maxSpeed !== "undefined" && sqrSpeed > this.maxSpeed * this.maxSpeed) {
      // Cap our speed.
      vec2.scale(velocity, vec2.normalize(velocity, velocity), this.maxSpeed);
    }
    return sqrSpeed;
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

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    // Because this class is inherited, 'type' may be different.
    // if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedGameBaseObject;

    if (initialize) deserializeVec2(this.position, pObj.position);
    deserializeVec2(this.serverPosition, pObj.position);
    deserializeVec2(this.velocity, pObj.velocity);
    deserializeVec2(this.totalForce, pObj.totalForce);
    this.rotation = pObj.rotation;
    this.radius = pObj.radius;
    this.mass = pObj.mass;
    this.minSpeed = pObj.minSpeed;
    this.maxSpeed = pObj.maxSpeed;

    // Reset lerp progress
    this.serverLerpProgress = 0;
  }
}
