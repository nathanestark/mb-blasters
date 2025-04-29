import WarpBase from "@shared/game/specials/warp";
import { Camera, Math2D, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";
import { vec2 } from "gl-matrix";
import Game from "../index";

export default class Warp extends WarpBase {
  _animationStartTime: number = 0;
  _stretchAnimationStartTime: number = 0;

  jumping() {
    this._animationStartTime = 0;
    this._stretchAnimationStartTime = 0;
  }
  jump() {
    this._jumping = true;
    this._animationStartTime = 0;
    this._stretchAnimationStartTime = 0;
    setTimeout(() => (this._jumping = false), 1000);
  }

  beforeShipDrawAfterTransLocal(
    _camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void {
    if (this._on) {
      if (!this._stretchAnimationStartTime) this._stretchAnimationStartTime = time.animationTime;
      // Stretch ship out over time.
      const scale = 2.5 - 1.5 / (1 + (time.animationTime - this._stretchAnimationStartTime) / 300);
      context.scale(scale, 1);
    }
  }

  afterShipDrawGlobal(
    camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ) {
    if (this._jumping && this._to && this._from) {
      this.drawWarpStar(camera, context, time, this._to);
      this.drawWarpStar(camera, context, time, this._from);
    }
  }

  beforeShipDrawGlobal(
    camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ) {
    if (this._jumping && this._to && this._from) {
      this.drawWarpLine(camera, context, time, this._from, this._to);
    }
  }

  drawWarpStar(
    _camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime,
    loc: vec2
  ) {
    const game = this.owner.game as Game;
    const warp = game.resources.get("warp");
    context.save();

    context.translate(loc[0], loc[1]);

    if (!this._animationStartTime) this._animationStartTime = time.animationTime;
    const alpha = Math.max(
      0,
      Math.min(1, 1 - (time.animationTime - this._animationStartTime) / 500)
    );
    context.globalAlpha = -4 * (alpha - 0.5) ** 2 + 1;

    if (warp?.image) {
      context.drawImage(warp?.image, -warp?.image.width / 2, -warp?.image.height / 2);
    }
    context.restore();
  }

  drawWarpLine(
    _camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime,
    from: vec2,
    to: vec2
  ) {
    context.save();

    if (!this._animationStartTime) this._animationStartTime = time.animationTime;
    const alpha = Math.max(
      0,
      Math.min(1, 1 - (time.animationTime - this._animationStartTime) / 500)
    );
    context.globalAlpha = -4 * (alpha - 0.5) ** 2 + 1;

    context.beginPath();
    context.moveTo(from[0], from[1]);
    context.lineTo(to[0], to[1]);

    context.strokeStyle = "rgba(255,255,255,0.3)";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.shadowColor = "rgba(255,255,255,0.3)";

    context.shadowBlur = 8;
    context.stroke();

    context.shadowBlur = 5;
    context.stroke();

    context.shadowColor = this.owner._color;
    context.shadowBlur = 32;
    context.stroke();

    context.shadowColor = "rgba(255,255,255,0.3)";
    context.shadowBlur = 3;
    context.stroke();

    context.restore();
  }
}
