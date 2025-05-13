import { vec2 } from "gl-matrix";

import { Resources, SeededRNG } from "star-engine";
import PlanetBase, {
  SerializedPlanet,
  PlanetType,
  PlanetProperties
} from "@shared/game/background/planet";
import DefaultCamera from "../defaultCamera";
import { RefreshTime } from "star-engine";
import Game from "..";

export { SerializedPlanet };

export default class Planet extends PlanetBase {
  _image: HTMLImageElement;
  _showStartTime: number = 0;

  constructor(image: HTMLImageElement, props: PlanetProperties) {
    super(props);
    this._image = image;
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    if (!this._image) return;

    const game = this._game as Game;

    camera.context.save();

    if (game.worldBounds) {
      const bounds = game.worldBounds;
      camera.context.beginPath();
      camera.context.rect(bounds.position[0], bounds.position[1], bounds.size[0], bounds.size[1]);
      camera.context.clip();
    }

    // Negate camera position, add depth
    const drawPos = vec2.scale(vec2.create(), camera.position, this.depth);
    // Add our obj's position.
    vec2.add(drawPos, drawPos, this.position);

    // Position it.
    camera.context.translate(drawPos[0], drawPos[1]);

    // Rotate.
    camera.context.rotate(this.rotation);
    camera.context.translate(this.size[0] / -2, this.size[1] / -2);

    camera.context.drawImage(this._image, 0, 0, this.size[0], this.size[1]);
    camera.context.restore();
  }

  static from(resources: Resources, sObj: SerializedPlanet): Planet {
    const planetImage = resources.get(sObj.planetType)?.image;

    const obj = new Planet(planetImage!, { size: vec2.create() });
    obj._id = sObj.id;
    obj.deserialize(sObj, true);

    return obj;
  }
}
