import { vec2 } from "gl-matrix";
import {
  EventEmitter,
  GameObjectEventTypes,
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

export interface CollidedContext {
  thisObj: ColliderResult;
  otherObj: ColliderResult;
  canceled: boolean;
}
export interface HitContext {
  thisObj: CircleColliderResult;
  targetObj: CircleColliderResult;
  canceled: boolean;
}

export interface SerializedCollidableGameBaseObject extends SerializedGameBaseObject {
  elasticity: number;
}

export interface CollidableGameBaseObjectProperties extends GameBaseObjectProperties {
  elasticity?: number;
}

export interface CollidableGameBaseObjectEventTypes extends GameObjectEventTypes {
  collided: [
    obj: CollidableGameBaseObject,
    target: CollidableGameBaseObject,
    context: CollidedContext
  ];
  hit: [obj: CollidableGameBaseObject, target: CollidableGameBaseObject, context: HitContext];
}

export default class CollidableGameBaseObject
  extends GameBaseObject
  implements
    GameObject2D,
    CircleCollidable,
    NetworkSerializable,
    NetworkDeserializable,
    EventEmitter<CollidableGameBaseObjectEventTypes>
{
  elasticity: number = 1;
  target: CollidableGameBaseObject | null = null;

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

  onHit(target: CollidableGameBaseObject, context: HitContext): void {
    this.emit("hit", this, target, context);
  }

  testHitTarget(
    target: CollidableGameBaseObject,
    thisObj: CircleColliderResult,
    targetObj: CircleColliderResult
  ) {
    if (this.target || target.target) return;

    // Fire onHit for both targets.
    let context: HitContext = {
      thisObj: thisObj,
      targetObj: targetObj,
      canceled: false
    };
    this.onHit(target, context);
    if (!context.canceled) {
      this.target = target;
    }

    context = {
      thisObj: targetObj,
      targetObj: thisObj,
      canceled: false
    };
    target.onHit(this, context);
    if (!context.canceled) {
      target.target = this;
    }
  }

  // Determine if we want the collision to take place.
  onCollision(_thisObj: ColliderResult, _otherObj: ColliderResult) {
    // By default, collisions take place; we don't cancel.
  }

  // Once we've collided, what should we do?
  onCollided(thisObj: ColliderResult, otherObj: ColliderResult) {
    const context: CollidedContext = { thisObj, otherObj, canceled: false };
    this.emit("collided", this, context);
    if (context.canceled) return;

    const cThisObj = thisObj as CircleColliderResult;
    const cOtherObj = otherObj as CircleColliderResult;
    const cOtherOwner = otherObj.owner as CollidableGameBaseObject;

    // Check if we 'hit'.
    if (cOtherOwner && cOtherOwner instanceof CollidableGameBaseObject) {
      this.testHitTarget(cOtherOwner, cThisObj, cOtherObj);
    }

    // Bounce our object.
    const normal = cThisObj.normal;
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
    const tempVel = vec2.create();
    vec2.scale(tempVel, this.velocity, cThisObj.timeLeft);
    vec2.add(this.position, cThisObj.position, tempVel);

    // As a last check, we need to make sure that despite all this, the two objects
    // are not on top of each other. But doesn't count if we took a hit.
    const minDist = cThisObj.radius + cOtherObj.radius + Number.EPSILON;
    if (!this.target && vec2.sqrDist(this.position, cOtherObj.owner!.position) <= minDist ** 2) {
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
