import GravBase from "@shared/game/specials/grav";
import { Math2D, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";

export default class Grav extends GravBase {
  _animationStartTime: number = 0;

  activate() {
    this._animationStartTime = 0;
  }

  afterShipDrawAfterTransLocal(
    _camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ) {
    if (!this._on) return;

    this.drawStrokeRing(context, time);
  }

  drawStrokeRing(context: OffscreenCanvasRenderingContext2D, time: RefreshTime) {
    if (!this._animationStartTime) this._animationStartTime = time.animationTime;
    const ellapsedTime =
      (time.animationTime - this._animationStartTime) * 0.00002 * (20 + this.power); //0.001;

    const waveSize = 50;

    context.save();

    const maxWaves = 2 + this.power / 25;

    const innerBounds = this.owner.radius;
    const outerBounds = innerBounds + Math.min(maxWaves - 1, ellapsedTime + 1) * waveSize;

    for (let x = 0; x < maxWaves; x++) {
      const step = (this._direction == 1 ? 0 : maxWaves) + this._direction * x; // Determine step from MAX waves.
      context.save();

      let virtualREnd =
        this.owner.radius +
        (this._direction == 1 ? waveSize * maxWaves : 0) +
        -this._direction * (((ellapsedTime + step) * waveSize) % (waveSize * maxWaves));
      const virtualRStart = virtualREnd - waveSize;

      const rEnd = Math.min(outerBounds, virtualREnd);
      const rStart = Math.max(innerBounds, virtualRStart);

      const lineWidth = Math.min(waveSize, rEnd - rStart);

      const gradient = context.createRadialGradient(0, 0, rStart, 0, 0, virtualREnd);
      let firstStop = true;
      let yOffset = 0;
      for (let y = 0; y < 10; y += 1) {
        const baseStop = y / 10;
        let stop = (y - yOffset) / (10 - yOffset);
        const stopPos = virtualRStart + baseStop * waveSize;
        if (stopPos < innerBounds) continue;

        if (firstStop) {
          firstStop = false;
          if (stop != 0) {
            const newStop = (rStart - virtualRStart) / waveSize;
            yOffset = newStop * 10;
            stop = (y - yOffset) / (10 - yOffset);
            const alpha = -Math.cos(Math.PI * newStop * 2) * 0.5 + 0.5;
            gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
          }
        }
        const alpha = -Math.cos(Math.PI * baseStop * 2) * 0.5 + 0.5;
        gradient.addColorStop(stop, `rgba(255,255,255,${alpha})`);
      }
      gradient.addColorStop(1, `rgba(255,255,255,${0})`);

      context.strokeStyle = gradient;
      context.lineWidth = lineWidth;

      context.globalAlpha = 1 - (rEnd - innerBounds) / (outerBounds - innerBounds);
      context.beginPath();
      context.arc(0, 0, rStart + lineWidth / 2, 0, Math2D.twoPi);
      context.stroke();
      context.restore();
    }

    context.restore();
  }
}
