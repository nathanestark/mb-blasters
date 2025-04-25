import { CircleColliderResult, ColliderResult } from "star-engine";
import { NetworkObject } from "./network";
import GameBaseObject, {
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

export default class Bullet extends GameBaseObject {
  owner: GameBaseObject;
  _color: string = "#860";

  constructor(owner: GameBaseObject, { color, ...superProps }: BulletProperties = {}) {
    super({
      ...{
        mass: 0.1,
        radius: 3
      },
      ...superProps
    });
    this.classTags.push("bullet");

    this.owner = owner;

    if (color) this._color = color;
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    if (this.removed) return;

    const myParent = otherObj.owner && otherObj.owner == this.owner;
    if (otherObj.owner instanceof GameBaseObject && myParent) return;

    super.onCollision(thisObj, otherObj);
  }

  onCollided(thisObj: CircleColliderResult, otherObj: ColliderResult) {
    if (this.removed) return;

    if (otherObj.owner instanceof GameBaseObject) {
      this.removed = true;
      this.game.removeGameObject(this);
    } else {
      super.onCollided(thisObj, otherObj);
    }
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

    if (this.active) this.owner = this.game.getGameObject(pObj.owner) as GameBaseObject;
    this._color = pObj.color;
  }
}
