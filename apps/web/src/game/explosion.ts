import { Math2D, RefreshTime, Resources } from "star-engine";
import ExplosionBase, {
  ExplosionProperties as ExplosionBaseProperties,
  SerializedExplosion
} from "@shared/game/explosion";
import DefaultCamera from "./defaultCamera";
import GameBaseObjectRenderer, {
  RenderableImageWithAnimation,
  RenderImage
} from "./gameBaseObjectRenderer";
import { vec2 } from "gl-matrix";

export { SerializedExplosion };

export interface ExplosionProperties extends ExplosionBaseProperties {
  image?: HTMLImageElement | RenderableImageWithAnimation | RenderImage;
}

export default class Explosion extends ExplosionBase {
  _renderer: GameBaseObjectRenderer;

  constructor({ image, ...superProps }: ExplosionProperties = {}) {
    super(superProps);
    this._renderer = new GameBaseObjectRenderer(this, { color: this._color, image: image });
    this._renderer.startAnimation("explode");
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    camera.saveState();
    camera.context.translate(this.position[0], this.position[1]);
    camera.context.rotate(this.rotation);

    this._renderer.draw(camera, time);
    camera.restoreState();
  }
  static shipExplosion(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    if (!image) return;

    return {
      image: image,
      clipSize: vec2.fromValues(128, 128),
      rotation: Math.PI / 1,
      animations: {
        explode: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 1,
          clipSize: vec2.fromValues(128, 128),
          clipPosition: vec2.fromValues(0, 128),
          frameSpacing: vec2.fromValues(0, 128),
          frames: 10
        }
      }
    } as RenderableImageWithAnimation;
  }

  static from(resources: Resources, sObj: SerializedExplosion): Explosion {
    const explosionImage = resources.get(sObj.explosionType)?.image;
    const explosionImageFn = {
      shipexplosion: Explosion.shipExplosion
    }[sObj.explosionType];
    const image = !explosionImage ? null : explosionImageFn(explosionImage);
    const obj = new Explosion(image ? { image } : {});
    obj._id = sObj.id;
    obj.deserialize(sObj, true);
    return obj;
  }
}
