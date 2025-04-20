import { GameObject } from "star-engine";
import { NetworkObject, NetworkSerializable, NetworkDeserializable } from "./network";

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

  constructor({ name }: PlayerProperties = {}) {
    super();
    this.classTags.push("player", "network");

    if (name) this.name = name;
  }

  serialize(): SerializedPlayer {
    return {
      type: "Player",
      id: this.id,
      name: this.name
    };
  }

  deserialize(obj: NetworkObject) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    if (obj.type != "Player") throw "Type mismatch during deserialization!";

    const pObj = obj as SerializedPlayer;

    this.name = pObj.name;
  }
}
