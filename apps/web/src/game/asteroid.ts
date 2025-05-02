import { Math2D, RefreshTime } from "star-engine";
import AsteroidBase, { AsteroidProperties, SerializedAsteroid } from "@shared/game/asteroid";
import DefaultCamera from "./defaultCamera";
import Ship from "./ship";

export { SerializedAsteroid, AsteroidProperties };

export default class Asteroid extends AsteroidBase {
  draw(camera: DefaultCamera, _time: RefreshTime) {
    camera.context.translate(this.position[0], this.position[1]);
    camera.context.rotate(this.rotation);

    camera.context.fillStyle = this._color;
    camera.context.beginPath();

    camera.context.arc(0, 0, this.radius, 0, Math2D.twoPi);
    camera.context.fill();
  }

  static from(sObj: SerializedAsteroid): Asteroid {
    const obj = new Asteroid();
    obj._id = sObj.id;
    obj.deserialize(sObj);
    return obj;
  }
}
