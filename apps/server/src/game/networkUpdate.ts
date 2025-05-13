import { GameObject, RefreshTime } from "star-engine";
import Game from "./index";
import { NetworkObject, NetworkSerializable, NetworkUpdateData } from "@shared/game/network";

export interface NetworkUpdateProperties {
  minUpdateTime?: number;
}

export default class NetworkUpdate extends GameObject {
  _nextUpdateTime: number;
  _minUpdateTime: number = 1000;

  _updates: Array<NetworkSerializable | number> = [];

  constructor({ minUpdateTime }: NetworkUpdateProperties = {}) {
    super();
    this.classTags = ["networkUpdate"];

    this._nextUpdateTime = Date.now();
    if (typeof minUpdateTime !== "undefined") this._minUpdateTime = minUpdateTime;
  }

  requestUpdate(obj: NetworkSerializable) {
    this._updates.push(obj);
  }
  requestDelete(obj: NetworkSerializable) {
    this._updates.push(obj.id);
  }

  update(time: RefreshTime) {
    if (this._nextUpdateTime < time.curTime) {
      const objs = this.game.filter("network") as Array<NetworkSerializable>;
      this.issueNetworkUpdate(time, objs, true);
      this._nextUpdateTime = time.curTime + this._minUpdateTime;
    } else if (this._updates.length > 0) {
      this.issueNetworkUpdate(time, this._updates, false);
    }
    // Reset updates.
    this._updates = [];
  }

  issueNetworkUpdate(
    time: RefreshTime,
    objs: Array<NetworkSerializable | number>,
    fullUpdate: boolean
  ) {
    // console.log(
    //   time.curTime - time.lastTime,
    //   this._nextUpdateTime,
    //   time.curTime,
    //   this._minUpdateTime
    // );
    const sObjs = objs.reduce((memo, obj) => {
      if (typeof obj === "number") {
        return [...memo, { id: obj, type: "delete" }];
      }

      const sObj = obj.serialize();
      if (!sObj) return memo;
      return [...memo, sObj];
    }, [] as Array<NetworkObject>);

    const data: NetworkUpdateData = {
      fullUpdate: fullUpdate,
      timestamp: Date.now(),
      minSimUpdateTime: this.game._minUpdateTime,
      lastSimUpdateTime: time.curTime,
      objects: sObjs
    };

    const ioServer = (this.game as Game).ioServer;
    ioServer.emit("networkUpdate", data);
  }
}
