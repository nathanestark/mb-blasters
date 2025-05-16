import ShieldBase from "@shared/game/specials/shield";
import { Math2D, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";

export default class Shield extends ShieldBase {
  afterShipDrawAfterTransLocal(
    _camera: DefaultCamera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ) {
    if (!this._on) return;

    context.save();

    // Don't rotate the shield with the ship.
    context.rotate(-this.owner.rotation);

    const gradient = context.createRadialGradient(
      0,
      0,
      this.owner.radius / 4,
      0,
      0,
      this.owner.radius
    );
    const flashing = this._status >= 20 ? 0 : (Math.floor(time.animationTime / 5) % 100) / 100;
    gradient.addColorStop(0.35, `rgba(${flashing * 255}, ${102 + 153 * flashing}, 255, 0)`);
    gradient.addColorStop(
      1,
      `rgba(${flashing * 255}, ${102 + 153 * flashing}, 255, ${
        (Math.min(20, this._status) / 10) * 0.75
      })`
    );
    context.fillStyle = gradient;

    context.beginPath();
    context.arc(0, 0, this.owner.radius, 0, Math2D.twoPi);
    context.fill();

    context.restore();
  }
}
