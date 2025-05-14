import { Math2D, RefreshTime } from "star-engine";
import BulletBase, { BulletProperties, SerializedBullet } from "@shared/game/bullet";
import DefaultCamera from "./defaultCamera";
import Ship from "./ship";

export { SerializedBullet, BulletProperties };

export default class Bullet extends BulletBase {
  draw(camera: DefaultCamera, _time: RefreshTime) {
    camera.context.save();
    camera.context.translate(this.position[0], this.position[1]);
    camera.context.rotate(this.rotation);

    camera.context.fillStyle = this._color;
    camera.context.beginPath();

    camera.context.arc(0, 0, this.radius, 0, Math2D.twoPi);
    camera.context.fill();
    camera.context.restore();
  }

  static from(owner: Ship, sObj: SerializedBullet): Bullet {
    const obj = new Bullet(owner);
    obj._id = sObj.id;
    obj.deserialize(sObj, true);
    return obj;
  }
}
