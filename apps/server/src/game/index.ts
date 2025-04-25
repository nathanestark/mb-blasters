import { vec2 } from "gl-matrix";
import { Server } from "socket.io";
import GameBase, { GameProperties as GameBaseProperties } from "@shared/game/index";
import WorldBounds from "@shared/game/worldBounds";
import { CollisionDetection, Container } from "star-engine";
import Player from "./player";
import NetworkUpdate from "./networkUpdate";
import { ShipConfiguration } from "@shared/game/ship";
import Ship from "./ship";

interface GameProperties extends GameBaseProperties {}

export default class Game extends GameBase {
  ioServer: Server;
  _players: Container;
  _collidables: Container;
  _ships: Container;

  _worldBounds: WorldBounds;

  constructor(ioServer: Server, { ...superProps }: GameProperties = {}) {
    // Limit our server's ID range from 0 to half of max.
    // The clients will use half of max to max for their locally created objects.
    super({ idRange: { min: 0, max: Math.floor(Number.MAX_SAFE_INTEGER / 2) }, ...superProps });

    this.ioServer = ioServer;

    this.setTimeScale(1);

    const networkUpdate = new NetworkUpdate();

    this._players = new Container();

    this._worldBounds = new WorldBounds({
      position: vec2.fromValues(-500, -500),
      size: vec2.fromValues(1000, 1000)
    });

    this._collidables = new Container();
    this._ships = new Container();
    this._collidables.children = [this._worldBounds, this._ships];

    const collisionDetection = new CollisionDetection([
      this._worldBounds.position,
      this._worldBounds.size
    ]);

    // Add everything into the game. Order matters for updates.

    // Network update first
    this.addGameObject(networkUpdate);

    // Then players
    this.addGameObject(this._players);

    // Then world objects
    this.addGameObjects([this._collidables]);

    // Then collider
    this.addGameObject(collisionDetection);
  }

  async addPlayer(player: Player): Promise<Player> {
    return (await this.addGameObject(player, this._players)) as Player;
  }

  async spawnShip(player: Player, config: ShipConfiguration) {
    if (player.ship) {
      this.removeGameObject(player.ship);
    }
    const newShip = new Ship(player, {
      type: config.type,
      special: config.special,
      maxThrust: config.maxThrust,
      maxSpeed: config.maxSpeed,
      maxRotate: config.maxRotate,
      bulletSpeed: config.bulletSpeed,
      specialPower: config.specialPower
    });
    player.ship = newShip;
    newShip.on("destroyed", () => delete player.ship);
    return await this.addGameObject(newShip, this._ships);
  }
}
