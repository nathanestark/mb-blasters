import { GameObject } from "star-engine";
import {
  NetworkObject,
  NetworkSerializable,
  NetworkDeserializable,
  SerializableProperty,
  addSerializableProperty,
  serializeSerializables,
  hasPreviousStateChanged,
  setPreviousState,
  deserializeSerializables
} from "./network";

export interface PlayerProperties {
  name?: string;
}

export interface SerializedPlayer extends NetworkObject {
  name: string;
}

export default class Player
  extends GameObject
  implements NetworkSerializable, NetworkDeserializable
{
  name: string = "Player";
  classTags: Array<string> = [];
  serverTargetLastUpdateTime: number = 0;

  serializable: Array<SerializableProperty> = [];
  _previousState: Record<string, any> = {};

  constructor({ name }: PlayerProperties = {}) {
    super();
    this.classTags.push("player", "network");

    if (name) this.name = name;

    addSerializableProperty(this.serializable, "name");
    this.setPreviousState();
  }

  gameObjectAdded(): void {
    this.setPreviousState();
  }

  get hasChanged() {
    return hasPreviousStateChanged(this.serializable, this._previousState, this);
  }

  setPreviousState() {
    setPreviousState(this.serializable, this._previousState, this);
  }

  serialize(changesOnly = false): SerializedPlayer {
    return {
      type: "Player",
      id: this.id,
      ...serializeSerializables(this.serializable, this._previousState, this, changesOnly)
    } as SerializedPlayer;
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Player") throw "Type mismatch during deserialization!";

    deserializeSerializables(this.serializable, obj, this, initialize);
  }
}
