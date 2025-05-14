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

    this.addSerializableProperty("rng", {
      serializedName: "seed",
      serialize: (value: SeededRNG) => {
        return value.seed;
      },
      deserialize: (source: number) => {
        if (this.rng?.seed != source) {
          this.rng = new SeededRNG(source);
        }
      },
      equals: (a: SeededRNG, b: SeededRNG) => a.seed == b.seed
    });
  }

  generate() {
    // Always reset before generating.
    this.rng.reset();
  }

  serialize(changesOnly = false): SerializedProceduralObject | null {
    const sObj = super.serialize(changesOnly);
    if (!sObj) return null;
    return {
      ...sObj,
      type: "ProceduralObject" // Should get overwritten
    } as SerializedProceduralObject;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    super.deserialize(obj, initialize);
  }
}
