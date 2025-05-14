import { vec2 } from "gl-matrix";
import { GameObject, GameObject2D, BoundingBoxCollider, Collidable } from "star-engine";
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
} from "./network";

export interface SerializedWorldBounds extends NetworkObject {
  position: SerializedVec2;
  velocity: SerializedVec2;
  totalForce: SerializedVec2;
  size: SerializedVec2;
  bounds: [SerializedVec2, SerializedVec2];
}

export interface WorldBoundsProperties {
  position?: vec2;
  size?: vec2;
  color?: string;
}

export default class WorldBounds
  extends GameObject
  implements GameObject2D, Collidable, NetworkSerializable, NetworkDeserializable
{
  position: vec2;
  velocity: vec2 = vec2.create();
  totalForce: vec2 = vec2.create();
  size: vec2;
  bounds: [vec2, vec2];
  color: string;
  serverTargetLastUpdateTime: number = 0;
  _collider: BoundingBoxCollider;

  serializable: Array<SerializableProperty> = [];
  _previousState: Record<string, any> = {};

  constructor({ position, size, color }: WorldBoundsProperties = {}) {
    super();
    this.classTags = ["world", "network"];

    this.color = "#ccc";
    this.position = vec2.create();
    this.size = vec2.fromValues(1, 1);

    if (position) this.position = position;
    if (size) this.size = size;
    if (color) this.color = color;

    let pos1 = vec2.create();
    let pos2 = vec2.create();
    vec2.copy(pos1, this.position);
    vec2.add(pos2, this.position, this.size);
    this.bounds = [pos1, pos2];

    // Add a collider as a child.
    this._collider = new BoundingBoxCollider(this);
    this.children = [this._collider];

    this.addSerializableVec2Property("position");
    this.addSerializableVec2Property("velocity");
    this.addSerializableVec2Property("totalForce");
    this.addSerializableVec2Property("size");
    this.addSerializableProperty("bounds", {
      init: () => [vec2.create(), vec2.create()],
      copy: (to: [vec2, vec2], from: [vec2, vec2]) => {
        vec2.copy(to[0], from[0]);
        vec2.copy(to[1], from[1]);
      },
      serialize: (value: [vec2, vec2]) => {
        return [serializeVec2(value[0]), serializeVec2(value[1])];
      },
      deserialize: (source: [SerializedVec2, SerializedVec2]) => {
        deserializeVec2(this.bounds[0], source[0]);
        deserializeVec2(this.bounds[1], source[1]);
      },
      equals: (a: [vec2, vec2], b: [vec2, vec2]) => {
        return vec2.equals(a[0], b[0]) && vec2.equals(a[1], b[1]);
      }
    });
    this.addSerializableProperty("color");

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
      copy?: (to: vec2, from: vec2) => vec2;
      serialize?: (value: vec2) => SerializedVec2;
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
      copy?: (to: any, from: any) => any;
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

  update() {
    // Make sure bounds is set correctly.
    vec2.copy(this.bounds[0], this.position);
    vec2.add(this.bounds[1], this.position, this.size);
  }

  serialize(changesOnly = false): SerializedWorldBounds {
    return {
      type: "WorldBounds",
      id: this.id,
      ...serializeSerializables(this.serializable, this._previousState, this, changesOnly)
    } as SerializedWorldBounds;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";

    deserializeSerializables(this.serializable, obj, this, initialize);
  }
}
