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
import Warp from "./specials/warp";
import Grav from "./specials/grav";

export { SerializedShip };

interface ShipProperties extends ShipBaseProperties {
  image?: HTMLImageElement | RenderableImageWithAnimation | RenderImage;
}

export default class Ship extends ShipBase {
  owner: Player;

  _fireRecord: number = 0;
  _fireInterval?: NodeJS.Timeout;
  _renderer: GameBaseObjectRenderer;
  _canvas: OffscreenCanvas;
  _context: OffscreenCanvasRenderingContext2D;

  constructor(owner: Player, { image, ...superProps }: ShipProperties = {}) {
    super(owner, superProps);

    this.owner = owner;
    this._renderer = new GameBaseObjectRenderer(this, { color: this._color, image: image });

    this._fireRecord = 0;

    this._canvas = new OffscreenCanvas(1, 1);
    this._context = this._canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  }

  destroy() {
    if (this._fireInterval) clearInterval(this._fireInterval);
    super.destroy();
    this._renderer.startAnimation("destroy");
  }

  thrust(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this._emitter.emit("thrust", this, context);
    if (!context.cancel) {
      if (!!this._thrust != on) {
        this._thrust = on ? this._maxThrust : 0;
        if (on) {
          this._renderer.startAnimation("thrust");
        } else {
          this._renderer.stopAnimation();
        }
      }
    }
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    // To manipulate the ship's image, we need to draw first to
    // a new canvas

    // Start by resizing the canvas to match our incoming camera
    this._canvas.height = camera.canvas.height;
    this._canvas.width = camera.canvas.width;

    // Then draw our ship to the local canvas.

    if (this._special.beforeShipDrawGlobal)
      this._special.beforeShipDrawGlobal(camera, camera.context, time);

    if (this._special.beforeShipDrawLocal)
      this._special.beforeShipDrawLocal(camera, this._context, time);

    this._context.save();

    if (this._special.beforeShipDrawBeforeTransLocal)
      this._special.beforeShipDrawBeforeTransLocal(camera, this._context, time);

    this._context.translate(camera.canvas.width / 2, camera.canvas.height / 2);
    this._context.rotate(this.rotation);

    if (this._special.beforeShipDrawAfterTransLocal)
      this._special.beforeShipDrawAfterTransLocal(camera, this._context, time);

    this._renderer.draw(camera, time, this._context);

    if (this._special.afterShipDrawAfterTransLocal)
      this._special.afterShipDrawAfterTransLocal(camera, this._context, time);

    this._context.restore();

    if (this._special.afterShipDrawLocal)
      this._special.afterShipDrawLocal(camera, this._context, time);

    // Finally draw the local canvas onto the camera.
    camera.context.save();

    camera.context.translate(camera.canvas.width / -2, camera.canvas.height / -2);
    camera.context.translate(this.position[0], this.position[1]);

    camera.context.drawImage(this._canvas, 0, 0);
    camera.context.restore();

    // after global draw ship.
    if (this._special.afterShipDrawGlobal)
      this._special.afterShipDrawGlobal(camera, camera.context, time);
  }

  createSpecial(type: SpecialType, power: number): Special {
    if (type == "shield") return new Shield(this, power);
    else if (type == "warp") return new Warp(this, power);
    else if (type == "grav") return new Grav(this, power);
    else if (type == "antigrav") return new Grav(this, power, -1);
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
    ship.deserialize(sObj, true);
    return ship;
  }
}
