import { vec2 } from "gl-matrix";
import { GameObject, GameObject2D, BoundingBoxCollider, Collidable } from "star-engine";
import {
  NetworkSerializable,
  NetworkDeserializable,
  NetworkObject,
  SerializedVec2,
  serializeVec2,
  deserializeVec2
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
  _collider: BoundingBoxCollider;

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
  }

  update() {
    // Make sure bounds is set correctly.
    vec2.copy(this.bounds[0], this.position);
    vec2.add(this.bounds[1], this.position, this.size);
  }

  serialize(): SerializedWorldBounds {
    return {
      type: "WorldBounds",
      id: this.id,
      position: serializeVec2(this.position),
      velocity: serializeVec2(this.velocity),
      totalForce: serializeVec2(this.totalForce),
      size: serializeVec2(this.size),
      bounds: [serializeVec2(this.bounds[0]), serializeVec2(this.bounds[1])]
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedWorldBounds;

    deserializeVec2(this.position, pObj.position);
    deserializeVec2(this.velocity, pObj.velocity);
    deserializeVec2(this.totalForce, pObj.totalForce);
    deserializeVec2(this.size, pObj.size);
    deserializeVec2(this.bounds[0], pObj.bounds[0]);
    deserializeVec2(this.bounds[1], pObj.bounds[1]);
  }
}
