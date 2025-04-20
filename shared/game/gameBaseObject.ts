import { vec2 } from "gl-matrix";
import {
  CircleCollider,
  CircleCollidable,
  Math2D,
  GameObject2D,
  Collidable,
  Collider,
  CircleColliderResult,
  ColliderResult,
  GameObject
} from "star-engine";
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
  elasticity: number;
  minSpeed: number;
}

export interface GameBaseObjectProperties {
  position?: vec2;
  velocity?: vec2;
  rotation?: number;
  radius?: number;
  mass?: number;
  elasticity?: number;
  minSpeed?: number;
}

export default class GameBaseObject
  extends GameObject
  implements GameObject2D, CircleCollidable, NetworkSerializable, NetworkDeserializable
{
  position: vec2 = vec2.create();
  velocity: vec2 = vec2.create();
  totalForce: vec2 = vec2.create();
  rotation: number = 0;
  radius: number = 1;
  mass: number = 1;
  elasticity: number = 1;
  minSpeed: number = 0.1;
  removed: boolean = false;

  classTags: Array<string> = [];

  _collider: CircleCollider;

  constructor({
    position,
    velocity,
    rotation,
    radius,
    mass,
    elasticity,
    minSpeed
  }: GameBaseObjectProperties = {}) {
    super();

    this.classTags = ["gamebase", "network"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation == "number") this.rotation = rotation;
    if (typeof radius == "number") this.radius = radius;
    if (typeof mass == "number") this.mass = mass;
    if (typeof elasticity == "number") this.elasticity = elasticity;
    if (typeof minSpeed == "number") this.minSpeed = minSpeed;

    // Add a collider as a child.
    this._collider = new CircleCollider(this);

    this.children = [this._collider];
  }

  update(tDelta: number) {
    // Apply our total force to our velocity.
    vec2.scale(this.totalForce, this.totalForce, tDelta / this.mass);
    vec2.add(this.velocity, this.velocity, this.totalForce);

    let sqrSpeed = vec2.sqrLen(this.velocity);
    // Check if our velocity falls below epsilon.
    if (sqrSpeed <= this.minSpeed * this.minSpeed) {
      vec2.set(this.velocity, 0, 0);
      sqrSpeed = 0;
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

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    if (this.removed) return;

    const cThisObj = thisObj as CircleColliderResult;

    //collider: collider1,
    //parent: collider1.parent,
    //position: pos1,
    //normal: norm1,
    //velocity: vec2.clone(collider1.velocity),
    //timeLeft: t,
    //radius: collider1.radius,

    const normal = cThisObj.normal;

    // On collision, we want to bounce.
    const temp = vec2.create();

    const cOtherObj = otherObj as CircleColliderResult;

    if (otherObj && otherObj.owner instanceof GameBaseObject) {
      const gbOtherOwner = otherObj.owner as GameBaseObject;

      // Calculate new velocity for after the collision, and update our velocity.
      Math2D.calculateElasticCollisionVelocity(
        this.velocity,
        this.velocity,
        normal,
        this.elasticity * gbOtherOwner.elasticity,
        cThisObj.velocity,
        this.mass,
        cOtherObj.velocity,
        gbOtherOwner.mass
      );
    } else {
      Math2D.calculateElasticCollisionVelocity(
        this.velocity,
        this.velocity,
        normal,
        this.elasticity,
        cThisObj.velocity,
        this.mass
      );
    }

    // Finally calculate new position based off of collision position,
    // new velocity and negated timeLeft.
    vec2.scale(temp, this.velocity, cThisObj.timeLeft);
    vec2.add(this.position, cThisObj.position, temp);
  }

  onCollided(thisObj: ColliderResult, otherObj: ColliderResult) {
    if (this.removed || (otherObj.owner as GameBaseObject).removed) return;

    const cThisObj = thisObj as CircleColliderResult;

    if (otherObj.owner instanceof GameBaseObject) {
      const cOtherObj = otherObj as CircleColliderResult;
      const minDist = cThisObj.radius + cOtherObj.radius + Number.EPSILON;

      // As a last check, we need to make sure that despite all this, the two objects
      // are not on top of each other.
      if (vec2.sqrDist(this.position, cOtherObj.position) <= minDist * minDist) {
        const temp = vec2.create();
        vec2.sub(temp, this.position, cOtherObj.position);
        const amt = minDist - vec2.length(temp);
        vec2.normalize(temp, temp);

        vec2.scale(temp, temp, amt);
        vec2.add(this.position, this.position, temp);
      }
    }
  }

  serialize(): SerializedGameBaseObject {
    return {
      type: "GameBaseObject", // Should get overwritten
      id: this.id,

      position: serializeVec2(this.position),
      velocity: serializeVec2(this.velocity),
      totalForce: serializeVec2(this.totalForce),
      rotation: this.rotation,
      radius: this.radius,
      mass: this.mass,
      elasticity: this.elasticity,
      minSpeed: this.minSpeed
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
    this.elasticity = pObj.elasticity;
    this.minSpeed = pObj.minSpeed;
  }
}
