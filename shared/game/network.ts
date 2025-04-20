import { vec2 } from "gl-matrix";
import { GameObject } from "star-engine";

export interface NetworkSerializable extends GameObject {
  serialize: () => NetworkObject;
}

export interface NetworkDeserializable extends GameObject {
  deserialize: (obj: NetworkObject) => void;
}

export interface NetworkObject {
  type: string;
  id: number;
}

export interface NetworkUpdateData {
  timestamp: number;
  objects: Array<NetworkObject>;
}

export type SerializedVec2 = [number, number];
export function serializeVec2(value: vec2): SerializedVec2 {
  return [value[0], value[1]];
}

export function deserializeVec2(target: vec2, source: SerializedVec2) {
  vec2.set(target, ...source);
}
