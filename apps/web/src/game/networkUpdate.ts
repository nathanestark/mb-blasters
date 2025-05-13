import { GameObject, RefreshTime } from "star-engine";
import Game from "./index";
import CollidableGameBaseObject from "@shared/game/collidableGameBaseObject";
import { NetworkUpdateData, NetworkDeserializable } from "@shared/game/network";
import Player, { SerializedPlayer } from "./player";
import WorldBounds, { SerializedWorldBounds } from "./worldBounds";
import Ship, { SerializedShip } from "./ship";
import Bullet, { SerializedBullet } from "./bullet";
import Asteroid, { SerializedAsteroid } from "./asteroid";
import Explosion, { SerializedExplosion } from "./explosion";
import Starfield, { SerializedStarfield } from "./background/starfield";
import Planet, { SerializedPlanet } from "./background/planet";
import { vec2 } from "gl-matrix";

const DR_FREQ = 2000;

export interface NetworkUpdateProperties {}

export default class NetworkUpdate extends GameObject {
  _lastUpdates: Array<NetworkUpdateData>;
  _drift: number = 0;
  rtt: number = 0;

  constructor({}: NetworkUpdateProperties = {}) {
    super();
    this.classTags = ["networkUpdate"];
    this._lastUpdates = [];
  }

  gameObjectAdded() {
    const socket = (this.game as Game).socket;
    socket.on("networkUpdate", (data: NetworkUpdateData) => {
      // If this full update is newer than the last one, use this only.
      if (
        data.fullUpdate &&
        (this._lastUpdates.length == 0 ||
          this._lastUpdates[this._lastUpdates.length - 1].timestamp < data.timestamp)
      ) {
        this._lastUpdates = [data];
      } else {
        // Otherwise, append.
        this._lastUpdates.push(data);
      }
    });

    const ping = () => {
      const startTime = Date.now();
      socket.emit("drPing", () => {
        const endTime = Date.now();
        this.rtt = endTime - startTime;
        this._drift = Math.floor(this.rtt / 2);
      });
    };

    // Start pinging immediately.
    ping();
    setInterval(ping, DR_FREQ);
  }

  update(_time: RefreshTime) {
    const game = this.game as Game;

    // Evaluate our last payload, adding in new, updating existing, and removing
    // missing networked game object.
    this._lastUpdates.forEach((lastUpdate) => {
      // This network data is from the last sim update time.
      // Take that time, and subtract the timestamp time, to get the difference
      // between when it was calculated and when it was sent.
      // Add in our drift time to determine how long ago that simulation
      // snapshot was calculated.
      const lastUpdateTime =
        Date.now() - (this._drift + lastUpdate.timestamp - lastUpdate.lastSimUpdateTime);

      let toDelete = [] as Array<GameObject>;

      lastUpdate.objects.forEach((newObj) => {
        let localObj = game.getGameObject(newObj.id) as NetworkDeserializable;
        if (newObj.type == "delete") {
          if (localObj) toDelete.push(localObj);
        } else {
          if (!localObj) {
            if (newObj.type == "Player") {
              const player = (localObj = Player.from(newObj as SerializedPlayer));
              game.addGameObject(player, game.players);
            } else if (newObj.type == "WorldBounds") {
              const worldBounds = (localObj = WorldBounds.from(newObj as SerializedWorldBounds));
              game.worldBounds = worldBounds;
              game.addGameObject(worldBounds, game.collidables);
              // Update collision detection as well.
              vec2.copy(game.collisionDetection.maxBounds[0], worldBounds.position);
              vec2.copy(game.collisionDetection.maxBounds[1], worldBounds.size);
            } else if (newObj.type == "Ship") {
              // Find the owner of the ship.
              const sNewObj = newObj as SerializedShip;
              const owner = game.getGameObject(sNewObj.owner) as Player;
              // no owner? No ship.
              if (!owner) return;

              const ship = (localObj = Ship.from(owner, game.resources, sNewObj));
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

              const bullet = (localObj = Bullet.from(owner, sNewObj));
              game.addGameObject(bullet, game.collidables);
            } else if (newObj.type == "Asteroid") {
              const asteroid = (localObj = Asteroid.from(newObj as SerializedAsteroid));
              game.addGameObject(asteroid, game.collidables);
            } else if (newObj.type == "Explosion") {
              const explosion = (localObj = Explosion.from(
                game.resources,
                newObj as SerializedExplosion
              ));
              game.addGameObject(explosion, game.collidables);
            } else if (newObj.type == "Starfield") {
              const starfield = (localObj = Starfield.from(newObj as SerializedStarfield));
              game.addGameObject(starfield, game.background);
            } else if (newObj.type == "Planet") {
              const planet = (localObj = Planet.from(game.resources, newObj as SerializedPlanet));
              game.addGameObject(planet, game.background);
            } else {
              // Ignore any we don't recognize
              console.warn("Unrecognized serialized type in network update:", newObj.type);
            }
          } else if (localObj.deserialize) localObj.deserialize(newObj, false);
          else
            throw `Object ${newObj.id} (${newObj.type}) does not implement networkdeserializable`;
          localObj.serverTargetLastUpdateTime = lastUpdateTime;
        }
      });

      if (lastUpdate.fullUpdate) {
        // Find any to remove
        const existing: Set<number> = new Set(lastUpdate.objects.map((obj) => obj.id));
        toDelete = [...toDelete, ...game.filter("network").filter((obj) => !existing.has(obj.id))];
      }

      toDelete
        .filter((obj) => !obj.tags.includes("explosion")) // Let the client handle removal of explosions
        .forEach((obj) => {
          game.removeGameObject(obj);

          if (obj instanceof CollidableGameBaseObject) {
            (obj as CollidableGameBaseObject)._collider.canCollide = false;
          }
        });
    });
    // Clear out our updates.
    this._lastUpdates = [];
  }
}
