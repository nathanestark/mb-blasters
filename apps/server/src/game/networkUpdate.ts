import { GameObject } from "star-engine";
import Game from "./index";
import { NetworkSerializable, NetworkUpdateData } from "@shared/game/network";

export interface NetworkUpdateProperties {
  minUpdateTime?: number;
}

export default class NetworkUpdate extends GameObject {
  _nextUpdateTime: number;
  _minUpdateTime: number;

  constructor({ minUpdateTime }: NetworkUpdateProperties = {}) {
    super();
    this.classTags = ["networkUpdate"];

    this._nextUpdateTime = Date.now();
    if (typeof minUpdateTime !== "undefined") this._minUpdateTime = minUpdateTime;
    else this._minUpdateTime = 50;
  }

  update(_tDelta: number) {
    const curTime = Date.now();
    if (this._nextUpdateTime < curTime) {
      this.issueNetworkUpdate();
      this._nextUpdateTime = curTime + this._minUpdateTime;
    }
  }

  issueNetworkUpdate() {
    const objs = this.game.filter("network") as Array<NetworkSerializable>;
    const sObjs = objs.map((obj) => obj.serialize());

    const data: NetworkUpdateData = {
      timestamp: Date.now(),
      objects: sObjs
    };

    const ioServer = (this.game as Game).ioServer;
    ioServer.emit("networkUpdate", data);
  }
}
