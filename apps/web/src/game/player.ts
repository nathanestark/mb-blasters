import { NetworkObject } from "@shared/game/network";
import PlayerBase, {
  PlayerProperties as PlayerBaseProperties,
  SerializedPlayer
} from "@shared/game/player";

export { SerializedPlayer, PlayerBaseProperties };

export default class Player extends PlayerBase {
  static from(sPlayer: SerializedPlayer): Player {
    const player = new Player();
    player._id = sPlayer.id;
    player.deserialize(sPlayer, true);
    return player;
  }

  deserialize(obj: NetworkObject, initialize?: boolean): void {
    super.deserialize(obj, initialize);
    this.game?.emit("playerChanged", obj);
  }
}
