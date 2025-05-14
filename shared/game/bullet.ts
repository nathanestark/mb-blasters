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
    // Don't perform periodic network updates on bullets.
    // They will look smoother if we just let the client deal with them.
    this.classTags = this.classTags.filter((tag) => tag != "networkF1");

    this.owner = owner;

    if (color) this._color = color;

    this.addSerializableProperty("owner", {
      serialize: (value: CollidableGameBaseObject) => value.id,
      deserialize: (sValue: number) => {
        if (this.active) this.owner = this.game.getGameObject(sValue) as CollidableGameBaseObject;
      },
      equals: (a: CollidableGameBaseObject, b: CollidableGameBaseObject) => a.id == b.id
    });
    this.addSerializableProperty("_color", { serializedName: "color" });
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

  serialize(changesOnly = false): SerializedBullet | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Bullet"
    } as SerializedBullet;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Bullet") throw "Type mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
