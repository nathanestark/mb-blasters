import { vec2, vec3, quat } from "gl-matrix";
import { RefreshTime, Resources } from "star-engine";
import ShipBase, {
  ShipProperties as ShipBaseProperties,
  SerializedShip,
  OnOffEventContext
} from "@shared/game/ship";
import Bullet from "@shared/game/bullet";
import Player from "./player";
import GameBaseObjectRenderer, {
  RenderableImageWithAnimation,
  RenderImage
} from "./gameBaseObjectRenderer";
import DefaultCamera from "./defaultCamera";
import Game from "./index";
import { SpecialType, Special } from "@shared/game/specials";
import Shield from "./specials/shield";

export { SerializedShip };

interface ShipProperties extends ShipBaseProperties {
  image?: HTMLImageElement | RenderableImageWithAnimation | RenderImage;
}

export default class Ship extends ShipBase {
  owner: Player;

  _fireRecord: number = 0;
  _fireInterval?: NodeJS.Timeout;
  _renderer: GameBaseObjectRenderer;

  constructor(owner: Player, { image, ...superProps }: ShipProperties = {}) {
    super(owner, superProps);

    this.owner = owner;
    this._renderer = new GameBaseObjectRenderer(this, { color: this._color, image: image });

    this._fireRecord = 0;
  }

  destroy() {
    if (this._fireInterval) clearInterval(this._fireInterval);
    super.destroy();
    this._renderer.startAnimation("destroy");
  }

  thrust(on: boolean) {
    const context: OnOffEventContext = { on, cancel: false };
    this._emitter.emit("thrust", this, context);
    if (!context.cancel) {
      if (!!this._thrust != on) {
        if (on) {
          this._renderer.startAnimation("thrust");
        } else {
          this._renderer.stopAnimation();
        }
      }
    }
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    this._renderer.draw(camera, time);
    if (this._special.draw) this._special.draw(camera, time);
  }

  createSpecial(type: SpecialType, power: number): Special {
    if (type == "shield") return new Shield(this, power);
    return super.createSpecial(type, power);
  }

  static deltaShip(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    if (!image) return;

    return {
      image: image,
      clipSize: vec2.fromValues(64, 64),
      rotation: Math.PI / 2,
      animations: {
        thrust: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(0, 64),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 9,
          repeatMethod: "loop"
        },
        destroy: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(64, 0),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 5
        }
      }
    } as RenderableImageWithAnimation;
  }
  static sweepShip(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    if (!image) return;

    return {
      image: image,
      clipSize: vec2.fromValues(64, 64),
      rotation: Math.PI / 2,
      animations: {
        thrust: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(0, 64),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 9,
          repeatMethod: "loop"
        },
        destroy: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(64, 0),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 5
        }
      }
    };
  }
  static busterShip(
    image?: HTMLImageElement
  ): undefined | HTMLImageElement | RenderableImageWithAnimation | RenderImage {
    if (!image) return;

    return {
      image: image,
      clipSize: vec2.fromValues(64, 64),
      rotation: Math.PI / 2,
      animations: {
        thrust: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(0, 64),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 9,
          repeatMethod: "loop",
          getFrame: (animFrame: number) => {
            if (animFrame < 6) return animFrame;
            return 6 + ((animFrame - 6) % 3);
          }
        },
        destroy: {
          framesPerSecond: 20,
          image: image,
          rotation: Math.PI / 2,
          clipSize: vec2.fromValues(64, 64),
          clipPosition: vec2.fromValues(64, 0),
          frameSpacing: vec2.fromValues(0, 64),
          frames: 5
        }
      }
    };
  }

  static from(owner: Player, resources: Resources, sObj: SerializedShip): Ship {
    const shipImage = resources.get(sObj.shipType)?.image;
    const shipImageFn = {
      deltaship: Ship.deltaShip,
      sweepship: Ship.sweepShip,
      bustership: Ship.busterShip
    }[sObj.shipType];
    const image = !shipImage ? null : shipImageFn(shipImage);
    const ship = new Ship(owner, image ? { image } : {});
    ship._id = sObj.id;
    ship.deserialize(sObj);
    return ship;
  }
}
