import { CircleColliderResult, ColliderResult } from "star-engine";
import { NetworkObject } from "./network";
import CollidableGameBaseObject, {
  CollidableGameBaseObjectProperties,
  SerializedCollidableGameBaseObject
} from "./collidableGameBaseObject";

export interface BulletConfiguration {}

export interface SerializedBullet extends SerializedCollidableGameBaseObject {
  color: string;
  owner: number;
}

export interface BulletProperties extends CollidableGameBaseObjectProperties {
  color?: string;
}

export default class Bullet extends CollidableGameBaseObject {
  owner: CollidableGameBaseObject;
  _color: string = "#860";

  constructor(owner: CollidableGameBaseObject, { color, ...superProps }: BulletProperties = {}) {
    super({
      ...{
        mass: 0.5,
        radius: 3
      },
      ...superProps
    });
    this.classTags.push("bullet");

    this.owner = owner;

    if (color) this._color = color;
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    const myParent = otherObj.owner && otherObj.owner == this.owner;
    if (otherObj.owner instanceof CollidableGameBaseObject) {
      // Ignore the collision if it is another bullet, or our parent.
      const ignore = myParent || otherObj.owner instanceof Bullet;
      if (!ignore) {
        // Bullet should go away.
        this.removed = true;
        this._collider.canCollide = false;
        this.game.removeGameObject(this);
      }
      // If we impact, or are ignoring, we don't need the 'onCollided' called.
      thisObj.canceled = true;
      return;
    }

    super.onCollision(thisObj, otherObj);
  }

  serialize(): SerializedBullet | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Bullet",

      owner: this.owner.id,
      color: this._color
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Bullet") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedBullet;

    super.deserialize(obj);

    if (this.active) this.owner = this.game.getGameObject(pObj.owner) as CollidableGameBaseObject;
    this._color = pObj.color;
  }
}
