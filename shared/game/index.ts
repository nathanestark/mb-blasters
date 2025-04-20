import { Container, Game as GameProto, GameProperties as GameProtoProperties } from "star-engine";
import Player from "./player";

export interface GameProperties extends GameProtoProperties {}

export default class Game extends GameProto {
  constructor({ ...superProps }: GameProperties = {}) {
    super(superProps);
  }
}
