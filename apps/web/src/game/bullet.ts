import { Math2D, RefreshTime } from "star-engine";
import BulletBase, { BulletProperties, SerializedBullet } from "@shared/game/bullet";
import DefaultCamera from "./defaultCamera";
import Ship from "./ship";
import { vec2 } from "gl-matrix";

export { SerializedBullet, BulletProperties };

export default class Bullet extends BulletBase {
  softRemove: boolean = false;
  private last: Array<vec2> = [];

  update(time: RefreshTime) {
    super.update(time);

    this.last.push(vec2.clone(this.position));
    if (this.last.length > 10) this.last.shift();
  }

  allowDraw(camera: DefaultCamera): boolean {
    // Grow by our radius.
    const size = vec2.fromValues(camera.size.width, camera.size.height);
    vec2.scale(size, size, this.radius);

    return this.last.reduce(
      (allow, last) => allow || Math2D.pointInViewMatrix(last, camera.viewMatrix, size[0], size[1]),
      Math2D.pointInViewMatrix(this.position, camera.viewMatrix, size[0], size[1])
    );
  }

  draw(camera: DefaultCamera, _time: RefreshTime) {
    if (this.softRemove) return;

    camera.context.save();
    camera.context.translate(this.position[0], this.position[1]);
    camera.context.rotate(this.rotation);

    camera.context.fillStyle = this._color;
    camera.context.beginPath();

    camera.context.arc(0, 0, this.radius, 0, Math2D.twoPi);
    camera.context.fill();
    camera.context.restore();

    if (this.last.length > 0) {
      camera.context.save();
      const gradient = camera.context.createLinearGradient(
        this.last[0][0],
        this.last[0][1],
        this.last[this.last.length - 1][0],
        this.last[this.last.length - 1][1]
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, this._color);

      camera.context.strokeStyle = gradient;
      camera.context.lineWidth = this.radius;
      camera.context.beginPath();
      camera.context.moveTo(this.last[0][0], this.last[0][1]);
      for (let x = 0; x < this.last.length - 1; x++) {
        const p1 = this.last[x];
        const p0 = this.last[x - 1] || p1;
        const p2 = this.last[x + 1] || p1;
        const p3 = this.last[x + 2] || p2;

        camera.context.bezierCurveTo(
          p1[0] + (p2[0] - p0[0]) / 6,
          p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6,
          p2[1] - (p3[1] - p1[1]) / 6,
          p2[0],
          p2[1]
        );
      }
      camera.context.stroke();
      camera.context.restore();
    }
  }

  onClientRemove() {
    // We want the bullet to complete any collision clientside.
    // So delay removal for some time.
    setTimeout(() => {
      if (this.active) super.onClientRemove();
    }, 200);

    // But stop drawing it, so it looks like it disappeared appropriately.
    this.softRemove = true;
  }

  static from(owner: Ship, sObj: SerializedBullet): Bullet {
    const obj = new Bullet(owner);
    obj._id = sObj.id;
    obj.deserialize(sObj, true);
    return obj;
  }
}
