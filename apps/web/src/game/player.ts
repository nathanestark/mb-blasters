import PlayerBase, {
  PlayerProperties as PlayerBaseProperties,
  SerializedPlayer
} from "@shared/game/player";

export { SerializedPlayer, PlayerBaseProperties };

export default class Player extends PlayerBase {
  static from(sPlayer: SerializedPlayer): Player {
    const player = new Player();
    player._id = sPlayer.id;
    player.deserialize(sPlayer);
    return player;
  }
}
