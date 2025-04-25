import ShieldBase from "@shared/game/specials/shield";
import { Math2D, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";

export default class Shield extends ShieldBase {
  draw(camera: DefaultCamera, time: RefreshTime) {
    if (!this._on) return;

    const gradient = camera.context.createRadialGradient(
      0,
      0,
      this.owner.radius / 4,
      0,
      0,
      this.owner.radius
    );
    gradient.addColorStop(0, "rgba(255,255,255, 0)");
    const flashing = this._status >= 20 ? 0 : (Math.floor(time.animationTime / 5) % 100) / 100;
    console.log(flashing, Math.floor(time.animationTime / 5));
    gradient.addColorStop(
      1,
      `rgba(${flashing * 255}, ${102 + 153 * flashing}, 255, ${
        (Math.min(20, this._status) / 10) * 0.75
      })`
    );
    camera.context.fillStyle = gradient;

    camera.context.beginPath();
    camera.context.arc(0, 0, this.owner.radius, 0, Math2D.twoPi);
    camera.context.fill();
  }
}
