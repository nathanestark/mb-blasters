import { Socket } from "socket.io";
import PlayerBase, { PlayerProperties as PlayerBaseProperties } from "@shared/game/player";
import Ship from "./ship";

const CONNECTION_TIMEOUT = 10000;
const ACTIVITY_TIMEOUT = 60000;

interface PlayerProperties extends PlayerBaseProperties {}

export default class Player extends PlayerBase {
  socket: Socket;
  ship?: Ship;
  connectionTimeout: number = 0;
  activityTimeout: number = 0;

  constructor(socket: Socket, { ...superProps }: PlayerProperties = {}) {
    super(superProps);

    this.socket = socket;
  }

  ping() {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    this.connectionTimeout = +setTimeout(() => {
      console.log("Connection timeout");
      this.socket.disconnect(true);
    }, CONNECTION_TIMEOUT);
  }

  keepAlive() {
    if (this.activityTimeout) clearTimeout(this.activityTimeout);
    this.activityTimeout = +setTimeout(() => {
      console.log("Idle timeout");
      this.socket.disconnect(true);
    }, ACTIVITY_TIMEOUT);
  }

  disconnect() {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    if (this.activityTimeout) clearTimeout(this.activityTimeout);
    if (this.ship) {
      this.game.removeGameObject(this.ship);
    }

    this.game.removeGameObject(this);
    console.log("Player Disconnected");
  }
}
