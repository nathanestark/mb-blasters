import { vec2 } from "gl-matrix";
import { NetworkObject, serializeVec2, deserializeVec2, SerializedVec2 } from "../network";
import ProceduralObject, {
  SerializedProceduralObject,
  ProceduralObjectProperties
} from "./proceduralObject";

export type StarfieldType = "default" | "milkyway" | "cluster";

export interface SerializedStarfield extends SerializedProceduralObject {
  density: number;
  size: SerializedVec2;
  starfieldType: StarfieldType;
}

export interface StarFieldProperties extends ProceduralObjectProperties {
  density?: number;
  size: vec2;
  type?: StarfieldType;
}

export default class Starfield extends ProceduralObject {
  density: number = 1;
  size: vec2;
  type: StarfieldType = "default";

  constructor({ size, density, type, ...superProps }: StarFieldProperties) {
    super({
      ...superProps
    });
    this.classTags.push("starfield");

    this.size = size;

    if (typeof density == "number") this.density = density;
    if (type) this.type = type;

    this.addSerializableProperty("density");
    this.addSerializableVec2Property("size");
    this.addSerializableProperty("type", { serializedName: "starfieldType" });
  }

  serialize(changesOnly = false): SerializedStarfield | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Starfield"
    } as SerializedStarfield;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
