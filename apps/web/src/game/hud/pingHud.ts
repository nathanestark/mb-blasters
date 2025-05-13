import { RefreshTime, TextHud, TextHudProperties } from "star-engine";
import NetworkUpdate from "../networkUpdate";

export default class PingHud extends TextHud {
  _lastCalculateTime: number;
  _calculateInterval: number;
  _ping: number;

  constructor(properties: TextHudProperties) {
    super(properties);

    this._lastCalculateTime = 9999;
    this._calculateInterval = 0.5;
    this._ping = 0;
  }

  update(time: RefreshTime) {
    this._lastCalculateTime += time.timeAdvance;
    if (this._lastCalculateTime >= this._calculateInterval) {
      this._lastCalculateTime = 0;
      const networkUpdates = this._game.filter("networkUpdate") as Array<NetworkUpdate>;
      if (networkUpdates.length == 1) {
        this._ping = networkUpdates[0].rtt;
      }
    }
    this.text = "Ping: " + this._ping;
  }
}
