import { SeededRNG } from "star-engine";
import { NetworkObject } from "../network";
import BackgroundObject, {
  SerializedBackgroundObject,
  BackgroundObjectProperties
} from "./backgroundObject";

export interface SerializedProceduralObject extends SerializedBackgroundObject {
  seed: number;
}

export interface ProceduralObjectProperties extends BackgroundObjectProperties {
  seed?: number;
}

export default class ProceduralObject extends BackgroundObject {
  rng: SeededRNG;

  constructor({ seed, ...superProps }: ProceduralObjectProperties = {}) {
    super({
      ...superProps
    });
    this.classTags.push("procedural");

    this.rng = new SeededRNG(seed);
  }

  generate() {
    // Always reset before generating.
    this.rng.reset();
  }

  serialize(): SerializedProceduralObject | null {
    const sObj = super.serialize();
    if (!sObj) return null;
    return {
      ...sObj,
      type: "ProceduralObject", // Should get overwritten
      id: this.id,

      seed: this.rng.seed
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    super.deserialize(obj);

    const pObj = obj as SerializedProceduralObject;

    if (this.rng?.seed != pObj.seed) {
      this.rng = new SeededRNG(pObj.seed);
    }
  }
}
