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
  }

  serialize(): SerializedStarfield | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "Starfield",
      id: this.id,

      size: serializeVec2(this.size),
      density: this.density,
      starfieldType: this.type
    };
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    super.deserialize(obj, initialize);

    const pObj = obj as SerializedStarfield;

    deserializeVec2(this.size, pObj.size);
    this.density = pObj.density;
    this.type = pObj.starfieldType;
  }
}
