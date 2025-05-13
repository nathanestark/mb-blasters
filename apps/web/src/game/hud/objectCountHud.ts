import { RefreshTime, TextHud, TextHudProperties } from "star-engine";

export default class ObjectCountHud extends TextHud {
  _lastPrint: number;
  _lastCalculateTime: number;
  _calculateInterval: number;

  constructor(properties: TextHudProperties) {
    super(properties);

    this._lastPrint = 0;
    this._lastCalculateTime = 9999;
    this._calculateInterval = 0.5;
  }

  update(time: RefreshTime) {
    this._lastCalculateTime += time.timeAdvance;
    if (this._lastCalculateTime >= this._calculateInterval) {
      this._lastCalculateTime = 0;
      this._lastPrint = this._game.filter({ op: "exclusive", tags: ["collider"] }).length;
    }
    this.text = "# Col Objs: " + this._lastPrint.toFixed(0);
  }
}
