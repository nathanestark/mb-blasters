import { Math2D, RefreshTime, Resources } from "star-engine";
import AsteroidBase, {
  AsteroidProperties as AsteroidPropertiesBase,
  SerializedAsteroid
} from "@shared/game/asteroid";
import DefaultCamera from "./defaultCamera";
import Ship from "./ship";
import GameBaseObjectRenderer, {
  RenderableImageWithAnimation,
  RenderImage
} from "./gameBaseObjectRenderer";
import { vec2 } from "gl-matrix";
import CollidableGameBaseObject, { HitContext } from "@shared/game/collidableGameBaseObject";

export { SerializedAsteroid };

export interface AsteroidProperties extends AsteroidPropertiesBase {
  image?: HTMLImageElement | RenderableImageWithAnimation | RenderImage;
}

export default class Asteroid extends AsteroidBase {
  _renderer: GameBaseObjectRenderer;

  constructor({ image, ...superProps }: AsteroidProperties = {}) {
    super(superProps);
    this._renderer = new GameBaseObjectRenderer(this, { color: this._color, image: image });

    this.once("destroying", this.handleDestroying.bind(this));
  }

  handleDestroying() {
    this._renderer.startAnimation("destroy");
  }

  destroyed() {
    // Never go away on our own. Wait for the server to tell us to go away.
  }

  onHit(_target: CollidableGameBaseObject, _context: HitContext): void {
    // Do nothing when being hit. Let the server inform us.
  }

  onClientRemove(): void {
    super.destroyed();
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    camera.saveState();
    camera.context.translate(this.position[0], this.position[1]);
    camera.context.rotate(this.rotation);

    this._renderer.draw(camera, time);
    camera.restoreState();
  }

  private static defineAsteroid(
    image: HTMLImageElement | undefined,
    location: number
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    if (!image) return;

    return {
      image: image,
      clipSize: vec2.fromValues(256, 256),
      clipPosition: vec2.fromValues(0, location * 256),
      rotation: 0,
      animations: {
        destroy: {
          framesPerSecond: 20,
          image: image,
          rotation: 0,
          clipSize: vec2.fromValues(256, 256),
          clipPosition: vec2.fromValues(256, 0),
          offsetSize: vec2.fromValues(128, 128),
          frameSpacing: vec2.fromValues(0, 256),
          frames: 10
        }
      }
    } as RenderableImageWithAnimation;
  }

  static asteroid1(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 0);
  }
  static asteroid2(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 1);
  }
  static asteroid3(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 2);
  }
  static asteroid4(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 3);
  }
  static asteroid5(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 4);
  }
  static asteroid6(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 5);
  }
  static asteroid7(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 6);
  }
  static asteroid8(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 7);
  }
  static asteroid9(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 8);
  }
  static asteroid10(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    return Asteroid.defineAsteroid(image, 9);
  }

  static from(resources: Resources, sObj: SerializedAsteroid): Asteroid {
    const asteroidImage = resources.get("asteroid")?.image;
    const asteroidImageFn = {
      asteroid1: Asteroid.asteroid1,
      asteroid2: Asteroid.asteroid2,
      asteroid3: Asteroid.asteroid3,
      asteroid4: Asteroid.asteroid4,
      asteroid5: Asteroid.asteroid5,
      asteroid6: Asteroid.asteroid6,
      asteroid7: Asteroid.asteroid7,
      asteroid8: Asteroid.asteroid8,
      asteroid9: Asteroid.asteroid9,
      asteroid10: Asteroid.asteroid10
    }[sObj.asteroidType];
    const image = !asteroidImage ? null : asteroidImageFn(asteroidImage);

    const obj = new Asteroid(image ? { image } : {});
    obj._id = sObj.id;
    obj.deserialize(sObj, true);
    return obj;
  }
}
