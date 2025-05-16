import { GameObject, RefreshTime } from "star-engine";
import Game from "./index";
import {
  NetworkObject,
  NetworkSerializable,
  NetworkUpdateData,
  NetworkUpdateTypes
} from "@shared/game/network";
import Player from "./player";
import EventEmitter from "events";

interface ObjUpdate {
  type: NetworkUpdateTypes;
  obj: NetworkSerializable;
}

export interface NetworkUpdateProperties {
  minUpdateTime?: number;
}

export default class NetworkUpdate extends GameObject {
  _nextUpdateTime: number;
  _minUpdateTime: number = 500;

  _updates: Array<ObjUpdate> = [];

  _newPlayers: Array<Player> = [];

  constructor({ minUpdateTime }: NetworkUpdateProperties = {}) {
    super();
    this.classTags = ["networkUpdate"];

    this._nextUpdateTime = Date.now();
    if (typeof minUpdateTime !== "undefined") this._minUpdateTime = minUpdateTime;
  }

  requestUpdate(obj: NetworkSerializable, type: NetworkUpdateTypes = "default") {
    this._updates.push({ type: type, obj });
  }

  updateNewPlayer(player: Player) {
    this._newPlayers.push(player);
  }

  update(time: RefreshTime) {
    // Let any new players know the full state.
    if (this._newPlayers.length > 0) {
      const objs = this.game.filter("network") as Array<NetworkSerializable>;
      const targets = this._newPlayers.map((player) => player.socket);
      this.issueNetworkUpdate(
        time,
        objs.map((obj) => ({ type: "full", obj })),
        targets
      );
      this._newPlayers = [];
    }

    let objs: Array<ObjUpdate> = [...this._updates];
    this._updates = [];

    if (this._nextUpdateTime < time.curTime) {
      objs = (this.game.filter("networkF1") as Array<NetworkSerializable>).reduce((list, obj) => {
        // Only add it in if it isn't already there.
        if (!list.some((item) => item.obj.id == obj.id)) {
          list.push({ type: "default", obj });
        }
        return list;
      }, objs);
      this._nextUpdateTime = time.curTime + this._minUpdateTime;
    }

    if (objs.length) {
      this.issueNetworkUpdate(time, objs, [(this.game as Game).ioServer]);
      objs.forEach((obj) => {
        if (obj.type == "delete") return;
        obj.obj.setPreviousState();
      });
    }
  }

  issueNetworkUpdate(time: RefreshTime, objs: Array<ObjUpdate>, targets: Array<EventEmitter>) {
    const sObjs = objs.reduce((memo, obj) => {
      if (obj.type == "delete") {
        return [...memo, { id: obj.obj.id, type: obj.type, __netType: obj.type }];
      }
      // Don't send it if nothing was changed.
      if (obj.type != "full" && !obj.obj.hasChanged) return memo;

      const sObj = obj.obj.serialize(obj.type != "full");
      if (!sObj) return memo;
      sObj.__netType = obj.type;
      return [...memo, sObj];
    }, [] as Array<NetworkObject>);

    // Nothing to send?
    if (sObjs.length == 0) return;

    const data: NetworkUpdateData = {
      timestamp: Date.now(),
      minSimUpdateTime: this.game._minUpdateTime,
      lastSimUpdateTime: time.curTime,
      objects: sObjs
    };

    targets.forEach((target) => target.emit("networkUpdate", data));
  }
}
