import { Socket } from "socket.io";
import PlayerBase, { PlayerProperties as PlayerBaseProperties } from "@shared/game/player";
import Ship from "./ship";

interface PlayerProperties extends PlayerBaseProperties {}

export default class Player extends PlayerBase {
  socket: Socket;
  ship?: Ship;

  constructor(socket: Socket, { ...superProps }: PlayerProperties = {}) {
    super(superProps);

    this.socket = socket;
  }
}
