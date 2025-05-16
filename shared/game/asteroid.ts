import { EventEmitter, ColliderResult } from "star-engine";
import { NetworkObject } from "./network";
import CollidableGameBaseObject, {
  CollidableGameBaseObjectProperties,
  SerializedCollidableGameBaseObject,
  HitContext,
  CollidableGameBaseObjectEventTypes
} from "./collidableGameBaseObject";

export type AsteroidTypes =
  | "asteroid1"
  | "asteroid2"
  | "asteroid3"
  | "asteroid4"
  | "asteroid5"
  | "asteroid6"
  | "asteroid7"
  | "asteroid8"
  | "asteroid9"
  | "asteroid10";
export interface AsteroidConfiguration {}

export interface SerializedAsteroid extends SerializedCollidableGameBaseObject {
  color: string;
  asteroidType: AsteroidTypes;
  destroying: boolean;
}

export interface AsteroidEventTypes extends CollidableGameBaseObjectEventTypes {
  destroying: [obj: Asteroid];
  destroyed: [obj: Asteroid];
  networkChange: [obj: Asteroid];
}

export const DESTROY_TIME = 1000;

export interface AsteroidProperties extends CollidableGameBaseObjectProperties {
  color?: string;
  type?: AsteroidTypes;
}

export default class Asteroid
  extends CollidableGameBaseObject
  implements EventEmitter<AsteroidEventTypes>
{
  _color: string = "#888";
  _type: AsteroidTypes = "asteroid1";
  _destroying: boolean = false;

  constructor({ color, type, ...superProps }: AsteroidProperties = {}) {
    super({
      ...{
        mass: 50,
        radius: 50
      },
      ...superProps
    });
    this.classTags.push("asteroid");

    if (color) this._color = color;
    if (type) this._type = type;

    this.addSerializableProperty("_type", { serializedName: "asteroidType" });
    this.addSerializableProperty("_color", { serializedName: "color" });
    this.addSerializableProperty("_destroying", {
      serializedName: "destroying",
      deserialize: (sValue: boolean) => {
        if (!this._destroying && sValue) {
          this.destroy();
        }
        this._destroying = sValue;
      }
    });
  }

  protected emit<K extends keyof AsteroidEventTypes>(
    event: K,
    ...args: AsteroidEventTypes[K]
  ): boolean {
    const ret = super.emit(event, ...args);
    if (!["collided"].includes(event as string)) {
      super.emit("networkChange", this);
    }
    return ret;
  }

  requestUpdate?(): void;

  destroy() {
    if (this._destroying) return;

    this._destroying = true;
    this._collider.canCollide = false;
    this.emit("destroying", this);

    setTimeout(() => this.destroyed(), DESTROY_TIME);
  }

  destroyed() {
    if (this.removed) return;

    this.removed = true;
    if (this.game) this.game.removeGameObject(this);
    this.emit("destroyed", this);
  }

  onHit(target: CollidableGameBaseObject, context: HitContext): void {
    super.onHit(target, context);

    // All legitimate hits should destroy.
    this.destroy();
  }

  onCollision(thisObj: ColliderResult, otherObj: ColliderResult) {
    super.onCollision(thisObj, otherObj);
    // Don't let asteroids collide with each other.
    if (otherObj.owner instanceof Asteroid) {
      thisObj.canceled = true;
    }
    // If we're destroyed, we can't collide anymore either.
    if (this._destroying) {
      thisObj.canceled = true;
    }
  }

  serialize(changesOnly = false): SerializedAsteroid | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Asteroid"
    } as SerializedAsteroid;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Asteroid") throw "Type mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
