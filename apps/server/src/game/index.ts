import { quat, vec2, vec3 } from "gl-matrix";
import { Server } from "socket.io";
import GameBase, { GameProperties as GameBaseProperties } from "@shared/game/index";
import WorldBounds from "@shared/game/worldBounds";
import { CollisionDetection, Container, Math2D } from "star-engine";
import Player from "./player";
import NetworkUpdate from "./networkUpdate";
import { ShipConfiguration } from "@shared/game/ship";
import Starfield from "@shared/game/background/starfield";
import Planet, { PlanetType } from "@shared/game/background/planet";
import Ship from "./ship";
import Asteroid from "@shared/game/asteroid";
import { NetworkSerializable } from "@shared/game/network";

interface GameProperties extends GameBaseProperties {}

export default class Game extends GameBase {
  ioServer: Server;
  _players: Container;
  _collidables: Container;
  _background: Container;
  _ships: Container;

  _worldBounds: WorldBounds;
  _networkUpdate: NetworkUpdate;

  constructor(ioServer: Server, { ...superProps }: GameProperties = {}) {
    // Limit our server's ID range from 0 to half of max.
    // The clients will use half of max to max for their locally created objects.
    super({ idRange: { min: 0, max: Math.floor(Number.MAX_SAFE_INTEGER / 2) }, ...superProps });

    this.ioServer = ioServer;

    this.setTimeScale(1);

    this._networkUpdate = new NetworkUpdate();

    this._players = new Container();

    this._worldBounds = new WorldBounds({
      position: vec2.fromValues(-2000, -1000),
      size: vec2.fromValues(4000, 2000)
    });

    this._collidables = new Container();
    this._background = new Container();
    this._ships = new Container();
    this._collidables.children = [this._ships, this._worldBounds];

    const collisionDetection = new CollisionDetection([
      this._worldBounds.position,
      this._worldBounds.size
    ]);

    // Add everything into the game. Order matters for updates.

    // Network update first
    this.addGameObject(this._networkUpdate);

    // Then players
    this.addGameObject(this._players);

    // Then world objects
    this.addGameObjects([this._background, this._collidables]);

    // Then collider
    this.addGameObject(collisionDetection);

    this.addBackground();

    // this.addAsteroid(50, 50);
    this.addSmallAsteroids();
    this.addMediumAsteroids();
    this.addLargeAsteroids();

    this.on("gameObjectAdded", (obj) => {
      if (obj.tags?.includes("network")) {
        this._networkUpdate.requestUpdate(obj as NetworkSerializable, "full");
      }
    });
    this.on("gameObjectRemoved", (obj) => {
      if (obj.tags?.includes("network")) {
        this._networkUpdate.requestUpdate(obj as NetworkSerializable, "delete");
      }
    });
  }

  addBackground() {
    // Add in a basic starfield.
    this.addGameObjects(
      [
        new Starfield({
          position: vec2.fromValues(0, 0),
          depth: 0.999,
          size: vec2.min(vec2.create(), this._worldBounds.size, vec2.fromValues(1920, 1080)),
          density: 0.0008 + (Math.random() * 0.001 - 0.0005),
          repeat: true
        }),
        new Starfield({
          position: vec2.fromValues((1 - 2 * Math.random()) * 500, (1 - 2 * Math.random()) * 250),
          depth: 0.995,
          size: vec2.min(vec2.create(), this._worldBounds.size, vec2.fromValues(1000, 500)),
          density: 0.01 + (Math.random() * 0.01 - 0.005),
          repeat: "x",
          type: "milkyway",
          rotation: Math.random() * Math2D.twoPi
        }),
        new Starfield({
          position: vec2.fromValues(0, 0),
          depth: 0.99,
          size: vec2.min(vec2.create(), this._worldBounds.size, vec2.fromValues(1920, 1080)),
          density: 0.0002 + (Math.random() * 0.001 - 0.0005),
          repeat: true
        }),
        ...new Array(10).fill(0).map(
          () =>
            new Starfield({
              position: vec2.fromValues(
                Math.random() * this._worldBounds.size[0] - this._worldBounds.size[0] / 2,
                Math.random() * this._worldBounds.size[1] - this._worldBounds.size[1] / 2
              ),
              depth: 0.9 + 0.09 * Math.random(),
              size: vec2.fromValues(Math.random() * 800 + 200, Math.random() * 800 + 200),
              density: 0.0001,
              type: "cluster",
              repeat: false
            })
        ),
        (() => {
          const size = 100 + Math.random() * 924;
          const depth = 0.8 + Math.random() * 0.1;
          const spawnWidth = Math.max(0, depth * (this._worldBounds.size[0] - size));
          const spawHeight = Math.max(0, depth * (this._worldBounds.size[1] - size));
          return new Planet({
            size: vec2.fromValues(size, size),
            position: vec2.fromValues(
              Math.random() * spawnWidth - spawnWidth / 2,
              Math.random() * spawHeight - spawHeight / 2
            ),
            depth: depth,
            type: `planet${Math.ceil(Math.random() * 6)}` as PlanetType
          });
        })()
      ],
      this._background
    );
  }

  addSmallAsteroids() {
    let numAsteroids = 20;

    for (let x = 0; x < numAsteroids; x++) {
      this.addAsteroid(5, 5);
    }
  }
  addMediumAsteroids() {
    let numAsteroids = 10;

    for (let x = 0; x < numAsteroids; x++) {
      this.addAsteroid(20, 20);
    }
  }
  addLargeAsteroids() {
    let numAsteroids = 5;

    for (let x = 0; x < numAsteroids; x++) {
      this.addAsteroid(50, 50);
    }
  }

  addAsteroid(mass: number, radius: number) {
    const position3D = vec3.fromValues(
      1,
      this._worldBounds.size[0] / 2 - radius,
      this._worldBounds.size[1] / 2 - radius
    );
    const rotQuat = quat.identity(quat.create());
    quat.rotateZ(rotQuat, rotQuat, Math.random() * Math.PI * 2);
    vec3.transformQuat(position3D, position3D, rotQuat);
    const position = vec2.fromValues(position3D[0], position3D[1]);
    // Make sure we are inside our boundaries
    const spawnBox = Math2D.inflateBoundingBox(
      [
        this._worldBounds.position,
        vec2.add(vec2.create(), this._worldBounds.position, this._worldBounds.size)
      ],
      -radius
    );

    vec2.max(position, position, spawnBox[0]);
    vec2.min(position, position, spawnBox[1]);

    this.addGameObject(
      new Asteroid({
        radius: radius,
        mass: mass,
        position: position,
        // image: this.resources.get("asteroid").image,
        velocity: vec2.fromValues(
          (1000 / mass) * (1 - Math.random() * 2),
          (1000 / mass) * (1 - Math.random() * 2)
        ),

        color: "white"
        // onDestroyed: (obj: Asteroid) => {
        //     destroy(obj);
        // }
      })
    );
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
    newShip.on("networkChange", () => {
      this._networkUpdate.requestUpdate(newShip);
    });
    return await this.addGameObject(newShip, this._ships);
  }
}
