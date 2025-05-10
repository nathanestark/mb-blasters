import { Socket } from "socket.io-client";
import {
  Container,
  CONTROLLER_ACTION,
  FPSHud,
  InputController,
  Resources,
  TextHud
} from "star-engine";
import GameBase, { GameProperties as GameBaseProperties } from "@shared/game/index";
import NetworkUpdate from "./networkUpdate";
import Player, { SerializedPlayer } from "./player";
import DefaultCamera from "./defaultCamera";
import CenteredHud from "./hud/centeredHud";
import DataHud from "./hud/dataHud";
import ObjectCountHud from "./hud/objectCountHud";
import { vec2 } from "gl-matrix";
import Ship from "./ship";
import { ShipConfiguration } from "@shared/game/ship";
import PingHud from "./hud/pingHud";
import WorldBounds from "./worldBounds";
import Dust from "./background/dust";

interface GameProperties extends GameBaseProperties {}

export default class Game extends GameBase {
  player?: number;
  ship: number | null = null;
  primaryCamera?: DefaultCamera;
  socket: Socket;
  resources: Resources;
  controller: InputController;

  players: Container;
  collidables: Container;
  background: Container;
  ships: Container;
  cameras: Container;
  centeredHud: Container;

  worldBounds?: WorldBounds;

  shipConfiguration: ShipConfiguration = {
    type: "bustership",
    special: "shield",
    bulletSpeed: 500,
    maxThrust: 3000,
    maxRotate: 0.04,
    maxSpeed: 600,
    specialPower: 50
  };

  constructor(socket: Socket, { ...superProps }: GameProperties = {}) {
    // Limit our client's ID range from half of max to max.
    // The clients will use half of max to max for their locally created objects.
    super({
      idRange: { min: Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1, max: Number.MAX_SAFE_INTEGER },
      ...superProps
    });

    this.socket = socket;

    this.resources = new Resources();

    // Process network updates first.
    this.addGameObject(new NetworkUpdate());

    this.players = new Container();
    this.addGameObject(this.players);

    this.background = new Container();
    this.addGameObject(this.background);

    this.collidables = new Container();
    this.ships = new Container();
    this.collidables.children = [this.ships];
    this.addGameObject(this.collidables);

    // Add in dust. We want it rendered above players + objects.
    const dust = new Dust();
    dust.generate();
    this.addGameObject(dust);

    this.centeredHud = new CenteredHud();
    const dataHud = new DataHud();
    dataHud.children = [
      new FPSHud({ position: vec2.fromValues(10, 10) }),
      new PingHud({ position: vec2.fromValues(10, 25) }),
      new ObjectCountHud({ position: vec2.fromValues(10, 40) }),
      this.centeredHud
    ];
    this.addGameObject(dataHud);

    this.cameras = new Container();
    this.addGameObject(this.cameras);

    // Set up controllers
    this.controller = new InputController();
    this.addInputController(this.controller);
  }

  async load() {
    await this.resources.load([
      { type: "image", path: "images/asteroid.png", names: ["asteroid"] },
      { type: "image", path: "images/ship1.png", names: ["deltaship"] },
      { type: "image", path: "images/ship2.png", names: ["sweepship"] },
      { type: "image", path: "images/ship3.png", names: ["bustership"] },
      { type: "image", path: "images/explosion1.png", names: ["shipexplosion"] },
      { type: "image", path: "images/warp.png", names: ["warp"] },
      { type: "image", path: "images/planet1.png", names: ["planet1"] },
      { type: "image", path: "images/planet2.png", names: ["planet2"] },
      { type: "image", path: "images/planet3.png", names: ["planet3"] },
      { type: "image", path: "images/planet4.png", names: ["planet4"] },
      { type: "image", path: "images/planet5.png", names: ["planet5"] },
      { type: "image", path: "images/planet6.png", names: ["planet6"] }
    ]);
  }

  connect() {
    console.log("Game.connect");
    this.socket.emit("initializePlayer", (sPlayer: SerializedPlayer) => {
      console.log("initializePlayer");

      // Handle disconnects?
      this.socket.on("disconnect", () => console.log("Disconnected by server!"));

      this.socket.on("error", (e) => console.warn("Message error:", e));

      let localObj = this.getGameObject(sPlayer.id) as Player;
      if (!localObj) {
        localObj = Player.from(sPlayer);
        this.addGameObject(localObj, this.players);
        this.player = localObj.id;
      } else if (localObj.deserialize) localObj.deserialize(sPlayer);
      else throw `Object ${sPlayer.id} (${sPlayer.type}) does not implement networkdeserializable`;
    });
  }

  addCamera(canvas: HTMLCanvasElement) {
    if (this.primaryCamera) return;

    this.primaryCamera = new DefaultCamera(canvas, { zoom: 1 });
    this.addGameObject(this.primaryCamera, this.cameras);
  }

  registerInput(element: HTMLElement) {
    this.controller.registerDevice(
      "keyboard",
      (triggerCall) => {
        element.addEventListener("keydown", triggerCall);
        element.addEventListener("keyup", triggerCall);
      },
      (event: KeyboardEvent) => {
        return {
          key: event.key.toLowerCase(),
          value: event.type == "keydown"
        };
      }
    );

    this.controller.registerDevice(
      "mouse",
      (triggerCall) => {
        element.addEventListener("mousedown", triggerCall);
        element.addEventListener("mouseup", triggerCall);
      },
      (event: MouseEvent) => {
        return {
          key: `${event.button}`,
          value: event.type == "mousedown"
        };
      }
    );
  }

  updatePlayer(player: { name: string }) {
    if (!this.player) return;

    this.socket.emit("updatePlayer", { id: this.player, type: "PlayerUpdate", ...player });
  }

  start() {
    super.start();
    this.allowSpawn();
  }

  async allowSpawn() {
    const fireMsg = new TextHud({
      textSize: 40,
      fontType: "Audiowide",
      textColor: "#f00",
      text: "PRESS FIRE TO SPAWN",
      justify: "center",
      position: vec2.fromValues(0, 0)
    });
    await this.addGameObject(fireMsg, this.centeredHud);

    const fireToSpawn = (on: boolean) => {
      if (on) {
        this.removeGameObject(fireMsg);
        this.controller.unbindCommand(
          { device: "mouse", key: "0" },
          CONTROLLER_ACTION,
          fireToSpawn
        );

        this.spawnShip(on);
      }
    };

    this.controller.bindCommand({ device: "mouse", key: "0" }, CONTROLLER_ACTION, fireToSpawn);
  }

  spawnShip(on: boolean) {
    console.log("Spawning ship", on, this.ship);
    if (!on || this.ship) return;

    // Add player ship.
    console.log("Spawning", this.shipConfiguration);
    this.socket.emit("spawnShip", this.shipConfiguration);
  }
  playerShipSpawned(ship: Ship) {
    console.log("Ship Spawned");
    this.ship = ship.id;
    if (this.primaryCamera) this.primaryCamera.target = ship;

    const fire = (on: boolean) => {
      this.socket.emit("fire", on);
    };
    const special = (on: boolean) => {
      this.socket.emit("special", on);
    };
    const thrust = (on: boolean) => {
      this.socket.emit("thrust", on);
    };
    const rotateCounterClockwise = (on: boolean) => {
      this.socket.emit("rotateCounterClockwise", on);
    };
    const rotateClockwise = (on: boolean) => this.socket.emit("rotateClockwise", on);

    this.controller.bindCommand({ device: "mouse", key: "0" }, CONTROLLER_ACTION, fire);
    this.controller.bindCommand({ device: "keyboard", key: " " }, CONTROLLER_ACTION, fire);
    this.controller.bindCommand({ device: "mouse", key: "2" }, CONTROLLER_ACTION, special);
    this.controller.bindCommand({ device: "keyboard", key: "shift" }, CONTROLLER_ACTION, special);
    this.controller.bindCommand({ device: "keyboard", key: "w" }, CONTROLLER_ACTION, thrust);
    this.controller.bindCommand(
      { device: "keyboard", key: "a" },
      CONTROLLER_ACTION,
      rotateCounterClockwise
    );
    this.controller.bindCommand(
      { device: "keyboard", key: "d" },
      CONTROLLER_ACTION,
      rotateClockwise
    );

    const destroying = () => {
      ship.off("destroying", destroying);

      if (this.primaryCamera) {
        console.log("Remove camera");
        delete this.primaryCamera.target;
      }
    };
    ship.on("destroying", destroying);

    const destroyed = () => {
      ship.off("destroyed", destroyed);
      this.ship = null;
      // this.cLives--;
      // this.lives.text = "Lives: " + this.cLives;

      // Clear the camera target if this was us.

      this.controller.unbindCommand({ device: "mouse", key: "0" }, CONTROLLER_ACTION, fire);
      this.controller.unbindCommand({ device: "keyboard", key: " " }, CONTROLLER_ACTION, fire);
      this.controller.unbindCommand({ device: "mouse", key: "2" }, CONTROLLER_ACTION, special);
      this.controller.unbindCommand(
        { device: "keyboard", key: "shift" },
        CONTROLLER_ACTION,
        special
      );
      this.controller.unbindCommand({ device: "keyboard", key: "w" }, CONTROLLER_ACTION, thrust);
      this.controller.unbindCommand(
        { device: "keyboard", key: "a" },
        CONTROLLER_ACTION,
        rotateCounterClockwise
      );
      this.controller.unbindCommand(
        { device: "keyboard", key: "d" },
        CONTROLLER_ACTION,
        rotateClockwise
      );

      // if (this.cLives > 0) {
      setTimeout(() => {
        this.allowSpawn();
        // const fireMsg = new TextHud({
        //   textSize: 40,
        //   textColor: "#f00",
        //   text: "Press Fire to Spawn",
        //   justify: "center",
        //   position: vec2.fromValues(0, 0)
        // });
        // this.addGameObject(fireMsg, this.centeredHud).then(() => {
        //   const fireToSpawn = (on: boolean) => {
        //     if (on) {
        //       this.removeGameObject(fireMsg);
        //       this.controller.unbindCommand(
        //         { device: "mouse", key: "0" },
        //         CONTROLLER_ACTION,
        //         fireToSpawn
        //       );

        //       this.spawnShip(on);
        //     }
        //   };

        //   this.controller.bindCommand(
        //     { device: "mouse", key: "0" },
        //     CONTROLLER_ACTION,
        //     fireToSpawn
        //   );
        // });
      }, 1000);
      // } else {
      //   clearInterval(this.spawnInterval);
      //   // Show game over.
      //   const gameOver = new TextHud({
      //     textSize: 40,
      //     textColor: "#f00",
      //     text: "Game Over",
      //     justify: "center",
      //     position: vec2.fromValues(0, 0)
      //   });
      //   this.addGameObject(gameOver, this.centeredHud).then((obj) => {
      //     let restart: () => void = null;
      //     restart = () => {
      //       this.removeGameObject(obj);
      //       this.controller.unbindCommand(
      //         { device: "mouse", key: "0" },
      //         CONTROLLER_ACTION,
      //         restart
      //       );

      //       this.startGame();
      //     };
      //     setTimeout(() => {
      //       this.controller.bindCommand({ device: "mouse", key: "0" }, CONTROLLER_ACTION, restart);
      //     }, 1000);
      //   });
      // }
    };
    ship.on("destroyed", destroyed);
  }
}
