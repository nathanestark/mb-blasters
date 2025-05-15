import { vec2 } from "gl-matrix";
import {
  CircleCollider,
  CircleCollidable,
  Math2D,
  GameObject2D,
  CircleColliderResult,
  ColliderResult
} from "star-engine";
import { NetworkObject, NetworkSerializable, NetworkDeserializable } from "./network";
import GameBaseObject, {
  SerializedGameBaseObject,
  GameBaseObjectProperties
} from "./gameBaseObject";

export interface SerializedCollidableGameBaseObject extends SerializedGameBaseObject {
  elasticity: number;
}

export interface CollidableGameBaseObjectProperties extends GameBaseObjectProperties {
  elasticity?: number;
}

export default class CollidableGameBaseObject
  extends GameBaseObject
  implements GameObject2D, CircleCollidable, NetworkSerializable, NetworkDeserializable
{
  elasticity: number = 1;

  _collider: CircleCollider;

  constructor({ elasticity, ...superProps }: CollidableGameBaseObjectProperties = {}) {
    super(superProps);

    this.classTags.push("collidable");

    if (typeof elasticity == "number") this.elasticity = elasticity;

    // Add a collider as a child.
    this._collider = new CircleCollider(this);

    this.children = [this._collider];

    this.addSerializableProperty("elasticity");
  }

  onClientRemove(): void {
    super.onClientRemove();
    this._collider.canCollide = false;
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
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

    if (otherObj && otherObj.owner instanceof CollidableGameBaseObject) {
      const gbOtherOwner = otherObj.owner as CollidableGameBaseObject;

      // Calculate new velocity for after the collision, and update our velocity.
      Math2D.calculateElasticCollisionVelocity(
        this.velocity,
        cThisObj.velocity,
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
        cThisObj.velocity,
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
    const cThisObj = thisObj as CircleColliderResult;
    const cOtherObj = otherObj as CircleColliderResult;
    const cOtherOwner = otherObj.owner as CollidableGameBaseObject;

    // If the other thing is no longer collidable, then we don't have to
    // adjust overlap.
    if (!cOtherObj.collider.canCollide) return;

    const minDist = cThisObj.radius + cOtherObj.radius + Number.EPSILON;

    // As a last check, we need to make sure that despite all this, the two objects
    // are not on top of each other.
    if (vec2.sqrDist(this.position, cOtherObj.owner!.position) <= minDist ** 2) {
      const temp = vec2.create();
      vec2.sub(temp, this.position, cOtherObj.owner!.position);
      const amt = minDist - vec2.length(temp);
      vec2.normalize(temp, temp);

      vec2.scale(temp, temp, amt);
      vec2.add(this.position, this.position, temp);
    }
  }

  serialize(changesOnly = false): SerializedCollidableGameBaseObject | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "CollidableGameBaseObject" // Should get overwritten
    } as SerializedCollidableGameBaseObject;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    // Because this class is inherited, 'type' may be different.
    // if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";
    super.deserialize(obj, initialize);
  }
}
