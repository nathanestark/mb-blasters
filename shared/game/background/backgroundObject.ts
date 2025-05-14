import { vec2 } from "gl-matrix";
import { GameObject, RefreshTime } from "star-engine";
import {
  NetworkSerializable,
  NetworkDeserializable,
  NetworkObject,
  SerializedVec2,
  serializeVec2,
  deserializeVec2,
  SerializableProperty,
  addSerializableProperty,
  hasPreviousStateChanged,
  setPreviousState,
  serializeSerializables,
  deserializeSerializables
} from "../network";

export interface SerializedBackgroundObject extends NetworkObject {
  position: SerializedVec2;
  velocity: SerializedVec2;
  rotation: number;
  repeat: boolean | "x" | "y";
  depth: number;
}

export interface BackgroundObjectProperties {
  position?: vec2;
  velocity?: vec2;
  rotation?: number;
  repeat?: boolean | "x" | "y";
  depth?: number;
}

export default class BackgroundObject
  extends GameObject
  implements NetworkSerializable, NetworkDeserializable
{
  position: vec2 = vec2.create();
  velocity: vec2 = vec2.create();
  rotation: number = 0;
  repeat: boolean | "x" | "y" = false;
  depth: number = 1; // 0 to 1, where 1 is infinitely far away.

  serverTargetLastUpdateTime: number = 0;

  classTags: Array<string> = [];

  serializable: Array<SerializableProperty> = [];
  _previousState: Record<string, any> = {};

  constructor({ position, velocity, rotation, repeat, depth }: BackgroundObjectProperties = {}) {
    super();

    this.classTags = ["gamebase", "network"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation === "number") this.rotation = rotation;
    if (typeof repeat !== "undefined") this.repeat = repeat;
    if (typeof depth === "number") this.depth = depth;
    this.addSerializableVec2Property("position");
    this.addSerializableVec2Property("velocity");
    this.addSerializableProperty("rotation");
    this.addSerializableProperty("repeat");
    this.addSerializableProperty("depth");

    this.setPreviousState();
  }

  gameObjectAdded(): void {
    this.setPreviousState();
  }

  protected addSerializableVec2Property(
    name: string,
    options?: {
      serializedName?: string;
      optional?: boolean;
      init?: () => vec2;
      copy?: (to: vec2, from: vec2) => void;
      serialize?: (value: vec2, changesOnly: boolean) => SerializedVec2;
      deserialize?: (sValue: SerializedVec2, initialize?: boolean) => void;
      equals?: (a: vec2, b: vec2) => boolean;
    }
  ) {
    this.addSerializableProperty(name, {
      optional: options?.optional,
      init: options?.init || vec2.create,
      copy: options?.copy || vec2.copy,
      serialize: options?.serialize || serializeVec2,
      deserialize:
        options?.deserialize ||
        ((source: SerializedVec2) => deserializeVec2((this as any)[name], source)),
      equals: vec2.equals
    });
  }

  protected addSerializableProperty(
    name: string,
    options?: {
      serializedName?: string;
      optional?: boolean;
      init?: () => any;
      copy?: (to: any, from: any) => void;
      serialize?: (value: any, changesOnly: boolean) => any;
      deserialize?: (sValue: any, initialize?: boolean) => void;
      equals?: (a: any, b: any) => boolean;
    }
  ) {
    addSerializableProperty(this.serializable, name, options);
  }

  get hasChanged() {
    return hasPreviousStateChanged(this.serializable, this._previousState, this);
  }

  setPreviousState() {
    setPreviousState(this.serializable, this._previousState, this);
  }

  update(time: RefreshTime) {
    if (vec2.sqrLen(this.velocity) > 0) {
      // Apply our velocity to our position, but don't destroy velocity.
      const vel = vec2.clone(this.velocity);
      vec2.scale(vel, vel, time.timeAdvance);
      vec2.add(this.position, this.position, vel);
    }
  }

  serialize(changesOnly = false): SerializedBackgroundObject | null {
    return {
      type: "BackgroundObject", // Should get overwritten
      id: this.id,
      ...serializeSerializables(this.serializable, this._previousState, this, changesOnly)
    } as SerializedBackgroundObject;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";

    deserializeSerializables(this.serializable, obj, this, initialize);
  }
}
