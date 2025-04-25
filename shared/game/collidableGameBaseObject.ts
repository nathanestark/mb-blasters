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

    if (otherObj && otherObj.owner instanceof CollidableGameBaseObject) {
      const gbOtherOwner = otherObj.owner as CollidableGameBaseObject;

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
    if (this.removed || (otherObj.owner as CollidableGameBaseObject).removed) return;

    const cThisObj = thisObj as CircleColliderResult;

    if (otherObj.owner instanceof CollidableGameBaseObject) {
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

  serialize(): SerializedCollidableGameBaseObject | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "CollidableGameBaseObject", // Should get overwritten
      id: this.id,

      elasticity: this.elasticity
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    // Because this class is inherited, 'type' may be different.
    // if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";
    super.deserialize(obj);

    const pObj = obj as SerializedCollidableGameBaseObject;

    this.elasticity = pObj.elasticity;
  }
}
