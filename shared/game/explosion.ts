import { NetworkObject } from "./network";
import GameBaseObject, {
  GameBaseObjectProperties,
  SerializedGameBaseObject
} from "./gameBaseObject";
import { vec2 } from "gl-matrix";
import { RefreshTime } from "star-engine";

export type ExplosionTypes = "shipexplosion";

export interface ExplosionConfiguration {}

export interface SerializedExplosion extends SerializedGameBaseObject {
  color: string;
  explosionType: ExplosionTypes;
  timespan: number;
}

export interface ExplosionProperties extends GameBaseObjectProperties {
  color?: string;
  type?: ExplosionTypes;
  timespan?: number;
}

export default class Explosion extends GameBaseObject {
  _color: string = "#860";
  _type: ExplosionTypes = "shipexplosion";
  _timespan: number = 1000;

  constructor({ color, type, timespan, ...superProps }: ExplosionProperties = {}) {
    super({
      ...{
        mass: 0,
        radius: 100
      },
      ...superProps
    });
    this.classTags.push("gamebase", "network", "explosion");

    if (color) this._color = color;
    if (type) this._type = type;
    if (timespan) this._timespan = timespan;
  }

  gameObjectAdded(): void {
    setTimeout(() => {
      if (this.game) this.game.removeGameObject(this);
    }, this._timespan);
  }

  update(_time: RefreshTime): void {
    // super.update(time);
  }

  serialize(): SerializedExplosion | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Explosion",

      color: this._color,
      explosionType: this._type,
      timespan: this._timespan
    };
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Explosion") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedExplosion;

    super.deserialize(obj, initialize);

    this._color = pObj.color;
    this._type = pObj.explosionType;
    this._timespan = pObj.timespan;
  }
}
