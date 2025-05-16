import { vec2 } from "gl-matrix";
import { GameObject } from "star-engine";

export interface NetworkSerializable extends GameObject {
  hasChanged: boolean;
  serialize: (changesOnly?: boolean) => NetworkObject | null;

  serializable: Array<SerializableProperty>;
  setPreviousState: () => void;
}

export interface SerializableProperty {
  name: string;
  serializedName: string;
  optional: boolean;
  equals?: (a: any, b: any) => boolean;
  init?: () => any;
  copy?: (to: any, from: any) => void;
  serialize?: (value: any, changesOnly: boolean) => any;
  deserialize?: (sValue: any, initialize?: boolean) => void;
}

export interface NetworkDeserializable extends GameObject {
  serverTargetLastUpdateTime: number;
  deserialize: (obj: NetworkObject, initialize?: boolean) => void;
}

export type NetworkUpdateTypes = "full" | "delete" | "default" | "noLerp";

export interface NetworkObject {
  type: string;
  id: number;
  __netType: NetworkUpdateTypes;
}

export interface NetworkUpdateData {
  timestamp: number;
  minSimUpdateTime: number;
  lastSimUpdateTime: number;
  objects: Array<NetworkObject>;
}

export type SerializedVec2 = [number, number];
export function serializeVec2(value: vec2): SerializedVec2 {
  return [value[0], value[1]];
}

export function deserializeVec2(target: vec2, source: SerializedVec2) {
  vec2.set(target, ...source);
}

export function hasPreviousStateChanged(
  serializable: Array<SerializableProperty>,
  previousState: Record<string, any>,
  currentState: Record<string, any>
): boolean {
  return serializable.some((val) => {
    if (!val.optional) return true;
    if (!val.equals) return previousState[val.name] != currentState[val.name];
    return !val.equals(previousState[val.name], currentState[val.name]);
  });
}

export function setPreviousState(
  serializable: Array<SerializableProperty>,
  previousState: Record<string, any>,
  currentState: Record<string, any>
) {
  serializable.forEach((val) => {
    if (!val.optional) return;
    if (typeof previousState[val.name] === "undefined" && val.init)
      previousState[val.name] = val.init();
    if (val.copy) val.copy(previousState[val.name], currentState[val.name]);
    else previousState[val.name] = currentState[val.name];
  });
}

export function addSerializableProperty(
  serializable: Array<SerializableProperty>,
  name: string,
  options?: {
    serializedName?: string;
    optional?: boolean;
    init?: () => any;
    copy?: (to: any, from: any) => void;
    serialize?: (value: any, changesOnly: boolean) => any;
    deserialize?: (sValue: any, initialize?: boolean) => any;
    equals?: (a: any, b: any) => boolean;
  }
) {
  const optional = typeof options?.optional === "undefined" ? true : options.optional;
  const serializedName =
    typeof options?.serializedName == "undefined" ? name : options.serializedName;

  serializable.push({
    name,
    serializedName,
    optional,
    init: options?.init,
    copy: options?.copy,
    serialize: options?.serialize,
    deserialize: options?.deserialize,
    equals: options?.equals
  });
}

export function serializeSerializables(
  serializable: Array<SerializableProperty>,
  previousState: Record<string, any>,
  currentState: Record<string, any>,
  changesOnly: boolean
): Record<string, any> {
  return serializable.reduce((state, val) => {
    const prev = previousState[val.name];
    const value = currentState[val.name];
    const areEqual = () => (val.equals ? val.equals(prev, value) : prev == value);
    if (changesOnly && val.optional && areEqual()) return state;

    return {
      ...state,
      [val.serializedName]: val.serialize ? val.serialize(value, changesOnly) : value
    };
  }, {});
}

export function deserializeSerializables(
  serializable: Array<SerializableProperty>,
  networkState: Record<string, any>,
  currentState: Record<string, any>,
  initialize: boolean
): void {
  serializable.forEach((val) => {
    const value = networkState[val.serializedName];
    if (typeof value === "undefined") return;

    if (val.deserialize) val.deserialize(value, initialize);
    else currentState[val.name] = value;
  });
}
