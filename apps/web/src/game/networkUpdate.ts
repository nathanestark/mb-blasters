import { GameObject } from "star-engine";
import Game from "./index";
import { NetworkUpdateData, NetworkDeserializable } from "@shared/game/network";
import Player, { SerializedPlayer } from "./player";
import WorldBounds, { SerializedWorldBounds } from "./worldBounds";
import Ship, { SerializedShip } from "./ship";
import Bullet, { SerializedBullet } from "./bullet";
import Asteroid, { SerializedAsteroid } from "./asteroid";
import Explosion, { SerializedExplosion } from "./explosion";
import CollidableGameBaseObject from "@shared/game/collidableGameBaseObject";

const DR_FREQ = 5000;

export interface NetworkUpdateProperties {}

export default class NetworkUpdate extends GameObject {
  _lastUpdate: NetworkUpdateData | null;
  _drift: number = 0;
  rtt: number = 0;

  constructor({}: NetworkUpdateProperties = {}) {
    super();

    this._lastUpdate = null;
  }

  gameObjectAdded() {
    const socket = (this.game as Game).socket;
    socket.on("networkUpdate", (data: NetworkUpdateData) => {
      // If this update is newer than the last one, use this.
      if (!this._lastUpdate || this._lastUpdate.timestamp < data.timestamp) {
        this._lastUpdate = data;
      }
    });

    setInterval(() => {
      const startTime = Date.now();
      socket.emit("drPing", () => {
        const endTime = Date.now();
        this.rtt = endTime - startTime;
        this._drift = Math.floor(this.rtt / 2);
      });
    }, DR_FREQ);
  }

  update(_tDelta: number) {
    if (!this._lastUpdate) return;

    const game = this.game as Game;
    // Set our game time to match the server time that the update was evaluated.
    game._lastUpdateTime = Date.now() - this._drift;

    this._lastUpdate.objects.forEach((newObj) => {
      let localObj = game.getGameObject(newObj.id) as NetworkDeserializable;
      if (!localObj) {
        if (newObj.type == "Player") {
          const player = Player.from(newObj as SerializedPlayer);
          game.addGameObject(player, game.players);
        } else if (newObj.type == "WorldBounds") {
          const worldBounds = WorldBounds.from(newObj as SerializedWorldBounds);
          game.addGameObject(worldBounds, game.collidables);
        } else if (newObj.type == "Ship") {
          // Find the owner of the ship.
          const sNewObj = newObj as SerializedShip;
          const owner = game.getGameObject(sNewObj.owner) as Player;
          // no owner? No ship.
          if (!owner) return;

          const ship = Ship.from(owner, game.resources, sNewObj);
          game.addGameObject(ship, game.ships);
          // If this is our ship, hook things up
          if (owner.id == game.player) {
            game.playerShipSpawned(ship);
          }
        } else if (newObj.type == "Bullet") {
          // Find the owner of the bullet.
          const sNewObj = newObj as SerializedBullet;
          const owner = game.getGameObject(sNewObj.owner) as Ship;
          // no owner? No bullet.
          if (!owner) return;

          const bullet = Bullet.from(owner, sNewObj);
          game.addGameObject(bullet, game.collidables);
        } else if (newObj.type == "Asteroid") {
          const asteroid = Asteroid.from(newObj as SerializedAsteroid);
          game.addGameObject(asteroid, game.collidables);
        } else if (newObj.type == "Explosion") {
          const explosion = Explosion.from(game.resources, newObj as SerializedExplosion);
          game.addGameObject(explosion, game.collidables);
        } else {
          // Ignore any we don't recognize
          console.warn("Unrecognized serialized type in network update:", newObj.type);
        }
      } else if (localObj.deserialize) localObj.deserialize(newObj);
      else throw `Object ${newObj.id} (${newObj.type}) does not implement networkdeserializable`;
    });

    // Find any to remove
    const existing: Set<number> = new Set(this._lastUpdate.objects.map((obj) => obj.id));
    game
      .filter("network")
      .filter((obj) => !existing.has(obj.id))
      .filter((obj) => !obj.tags.includes("explosion")) // Let the client handle removal of explosions
      .forEach((obj) => {
        game.removeGameObject(obj);

        if (obj instanceof CollidableGameBaseObject) {
          (obj as CollidableGameBaseObject)._collider.canCollide = false;
        }
      });

    // Clear out our update.
    this._lastUpdate = null;
  }
}
