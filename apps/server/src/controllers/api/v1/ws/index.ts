import { Socket } from "socket.io";
import Game from "@server/game/index";
import Player from "@server/game/player";
import { ShipConfiguration } from "@shared/game/ship";
import PlayerUpdate from "@shared/game/playerUpdate";

export const handleConnection = (game: Game) => (socket: Socket) => {
  console.log("Player Connecting...");
  (async function processConnection() {
    let player: Player = new Player(socket);
    // Deal with the initialize player call
    await new Promise<void>((resolve) => {
      socket.once("initializePlayer", async (callback: (player: any) => void) => {
        player = await game.addPlayer(player);
        player.ping();

        // Reply back with a player created message
        callback(player.serialize());
        resolve();
      });
    });
    console.log("...connected");

    // Deal with echo
    socket.on("echo", (msg: string, callback: (reply: string) => void) => {
      console.log("ECHO", msg);
      callback(`'${msg}' received`);
    });

    // Deal with ping
    socket.on("drPing", (callback: () => void) => {
      callback();

      player.ping();
    });

    // Start listening for messages from the client.
    socket.onAny((eventName: string, ...args: Array<any>) => {
      // Ignore initializePlayer, echo, and ping
      if (["initializePlayer", "echo", "drPing"].includes(eventName)) return;

      player.keepAlive();

      const handler = MESSAGE_HANDLERS[eventName];
      if (!handler) socket.emit("error", `Event '${eventName}' doesn't exist.`);
      else {
        try {
          handler(game, player, ...args);
        } catch (e) {
          socket.emit("error", `Failed to process '${eventName}'.`);
          console.error(`Failed to process ${eventName}`, e);
        }
      }
    });
    socket.on("disconnect", () => {
      player.disconnect();
    });

    // Issue updates to everyone about this player, and send the initial
    // gamestate to the player.
    game._networkUpdate.updateNewPlayer(player);
    game._networkUpdate.requestUpdate(player);
  })();
};

export const updatePlayer = (game: Game, player: Player, obj: PlayerUpdate) => {
  // Don't let players update other players.
  if (player.id != obj.id) throw { code: "unauthorized" };

  if (!game.getGameObject(player.id)) throw { code: "notFound", message: "Player not found" };

  console.log("Updating player name to", obj.name);
  player.name = obj.name || "";
  game._networkUpdate.requestUpdate(player);
};

export const spawnShip = (game: Game, player: Player, ship: ShipConfiguration) => {
  game.spawnShip(player, ship);
};

export const rotateCounterClockwise = (game: Game, player: Player, on: boolean) => {
  if (!player.ship) return;
  player.ship.rotateCounterClockwise(on);
};
export const rotateClockwise = (game: Game, player: Player, on: boolean) => {
  if (!player.ship) return;
  player.ship.rotateClockwise(on);
};
export const thrust = (game: Game, player: Player, on: boolean) => {
  if (!player.ship) return;
  player.ship.thrust(on);
};
export const fire = (game: Game, player: Player, on: boolean) => {
  if (!player.ship) return;
  player.ship.fire(on);
};
export const special = (game: Game, player: Player, on: boolean) => {
  if (!player.ship) return;
  player.ship.special(on);
};

const MESSAGE_HANDLERS: Record<string, (game: Game, ...args: Array<any>) => void> = {
  updatePlayer,
  spawnShip,
  rotateCounterClockwise,
  rotateClockwise,
  thrust,
  fire,
  special
};
