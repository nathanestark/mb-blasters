import { vec2 } from "gl-matrix";
import { NetworkObject, serializeVec2, deserializeVec2, SerializedVec2 } from "../network";
import BackgroundObject, {
  BackgroundObjectProperties,
  SerializedBackgroundObject
} from "./backgroundObject";

export type PlanetType = "planet1" | "planet2" | "planet3" | "planet4" | "planet5" | "planet6";

export interface SerializedPlanet extends SerializedBackgroundObject {
  size: SerializedVec2;
  planetType: PlanetType;
}

export interface PlanetProperties extends BackgroundObjectProperties {
  size: vec2;
  type?: PlanetType;
}

export default class Planet extends BackgroundObject {
  size: vec2;
  type: PlanetType = "planet1";

  constructor({ size, type, ...superProps }: PlanetProperties) {
    super({
      ...superProps
    });
    this.classTags.push("planet");

    this.size = size;

    if (type) this.type = type;

    this.addSerializableVec2Property("size");
    this.addSerializableProperty("type", { serializedName: "planetType" });
  }

  serialize(changesOnly = false): SerializedPlanet | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Planet"
    } as SerializedPlanet;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
