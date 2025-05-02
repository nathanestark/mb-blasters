import { CircleColliderResult, ColliderResult } from "star-engine";
import { NetworkObject } from "./network";
import CollidableGameBaseObject, {
  CollidableGameBaseObjectProperties,
  SerializedCollidableGameBaseObject
} from "./collidableGameBaseObject";

export interface AsteroidConfiguration {}

export interface SerializedAsteroid extends SerializedCollidableGameBaseObject {
  color: string;
}

export interface AsteroidProperties extends CollidableGameBaseObjectProperties {
  color?: string;
}

export default class Asteroid extends CollidableGameBaseObject {
  _color: string = "#888";

  constructor({ color, ...superProps }: AsteroidProperties = {}) {
    super({
      ...{
        mass: 50,
        radius: 50
      },
      ...superProps
    });
    this.classTags.push("asteroid");

    if (color) this._color = color;
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    // Don't let asteroids collide with each other.
    if (otherObj.owner instanceof Asteroid) {
      thisObj.canceled = true;
      return;
    }

    super.onCollision(thisObj, otherObj);
  }

  serialize(): SerializedAsteroid | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Asteroid",

      color: this._color
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Asteroid") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedAsteroid;

    super.deserialize(obj);

    this._color = pObj.color;
  }
}
