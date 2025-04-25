import { vec2 } from "gl-matrix";
import { Math2D, RefreshTime } from "star-engine";
import DefaultCamera from "./defaultCamera";
import GameBaseObject from "@shared/game/gameBaseObject";

export interface RenderableImage {
  image: HTMLImageElement;
  rotation: number;
  offsetPosition?: vec2;
  offsetSize?: vec2;
  clipSize?: vec2;
  clipPosition?: vec2;
}
export interface Animation extends RenderableImage {
  repeatMethod?: "loop" | "bounce";
  frames: number | Array<RenderableImage>;
  framesPerSecond?: number;
  framesPerMillisecond?: number;
  frameSpacing: vec2;
  getFrame?: (animFrame: number) => number;
}

export interface RenderableImageWithAnimation extends RenderableImage {
  defaultAnimation?: string;
  animations?: Record<string, Animation>;
}

export interface RenderImage extends RenderableImage {
  animations?: Record<string, RenderAnimation>;
  defaultAnimation?: string;
  curAnimation?: RenderAnimation;
  animationStartTime?: number;
  offsetPosition: vec2;
  offsetSize: vec2;
  clipSize: vec2;
  clipPosition: vec2;
}

export interface RenderAnimation {
  repeatMethod: "none" | "loop" | "bounce";
  framesPerMillisecond: number;
  frames: Array<RenderableImage>;
  getFrame: (animFrame: number) => number;
}

export interface DrawBaseObjectProperties {
  position?: vec2;
  radius?: number;
  rotation?: number;
  color?: string;
  image?: HTMLImageElement | RenderableImageWithAnimation | RenderImage;
}

export default class GameBaseObjectRenderer {
  object: GameBaseObject;

  color: string = "#fff";
  image?: RenderImage;

  constructor(obj: GameBaseObject, { color, image }: DrawBaseObjectProperties = {}) {
    this.object = obj;

    if (color) this.color = color;

    if (image) {
      this.image = this._processImage(image);
    }
  }

  _processImage(
    imgDef: HTMLImageElement | RenderableImage | RenderableImageWithAnimation | RenderImage
  ): RenderImage {
    const iImgDef = imgDef as HTMLImageElement;
    const rImgDef = imgDef as RenderableImage;
    const aImgDef = imgDef as RenderableImageWithAnimation;

    let ret: RenderImage = {
      image: rImgDef.image ? rImgDef.image : iImgDef,
      rotation: 0,
      offsetPosition: vec2.create(),
      offsetSize: vec2.create(),
      clipSize: vec2.create(),
      clipPosition: vec2.create()
    };

    if (rImgDef.image) ret.image = rImgDef.image;

    if (ret.image) {
      if (typeof rImgDef.rotation === "number") ret.rotation = rImgDef.rotation;

      if (rImgDef.offsetPosition) ret.offsetPosition = vec2.clone(rImgDef.offsetPosition);

      if (!rImgDef.offsetSize)
        if (rImgDef.clipSize) ret.offsetSize = vec2.clone(rImgDef.clipSize);
        else ret.offsetSize = vec2.fromValues(ret.image.width, ret.image.height);
      else ret.offsetSize = vec2.clone(rImgDef.offsetSize);

      if (rImgDef.clipPosition) ret.clipPosition = vec2.clone(rImgDef.clipPosition);

      if (!rImgDef.clipSize) ret.clipSize = vec2.fromValues(ret.image.width, ret.image.height);
      else ret.clipSize = vec2.clone(rImgDef.clipSize);
    }

    if (aImgDef.animations) {
      ret.animations = {};
      for (let name in aImgDef.animations) {
        const animation = aImgDef.animations[name];

        // Put in frames per millisecond.
        let framesPerMillisecond: number = animation.framesPerMillisecond || 0;
        if (!framesPerMillisecond) {
          if (!animation.framesPerSecond) {
            framesPerMillisecond = 30000; // default to 30/sec
          } else {
            framesPerMillisecond = animation.framesPerSecond / 1000;
          }
        }

        let repeatMethod: "none" | "loop" | "bounce" = "none";
        if (animation.repeatMethod) {
          repeatMethod = animation.repeatMethod;
        }
        const newAnimation: RenderAnimation = {
          framesPerMillisecond,
          repeatMethod,
          frames: [],
          getFrame: (animFrame: number) => animFrame
        };
        ret.animations[name] = newAnimation;

        // Only play once, by default.
        newAnimation.getFrame = (animFrame: number) => {
          return Math.min(animFrame, newAnimation.frames.length - 1);
        };
        if (animation.getFrame) newAnimation.getFrame = animation.getFrame;
        else if (newAnimation.repeatMethod == "loop") {
          // Or loop back to the beginning
          newAnimation.getFrame = (animFrame: number) => {
            return animFrame % newAnimation.frames.length;
          };
        } else if (newAnimation.repeatMethod == "bounce") {
          // Or bounce front to back to front to back
          newAnimation.getFrame = (animFrame: number) => {
            const length = newAnimation.frames.length - 1;
            return length - Math.abs((animFrame % (length * 2)) - length);
          };
        }

        newAnimation.frames = [];
        if (animation.frames instanceof Array) {
          for (let i = 0; i < animation.frames.length; i++) {
            newAnimation.frames.push(this._processImage(animation.frames[i]));
          }
        } else if (typeof animation.frames === "number") {
          const frameTemplate = this._processImage(animation);
          for (let i = 0; i < animation.frames; i++) {
            newAnimation.frames.push({
              image: frameTemplate.image,
              rotation: frameTemplate.rotation,
              offsetPosition: frameTemplate.offsetPosition,
              offsetSize: frameTemplate.offsetSize,
              clipSize: frameTemplate.clipSize,
              clipPosition: vec2.fromValues(
                frameTemplate.clipPosition[0] + animation.frameSpacing[0] * i,
                frameTemplate.clipPosition[1] + animation.frameSpacing[1] * i
              )
            });
          }
        }
      }

      // Setting default animation is up to them. If it isn't set, then
      // the 'default' is to show the image at the root.
      if (typeof aImgDef.defaultAnimation === "string") {
        ret.defaultAnimation = aImgDef.defaultAnimation;
        ret.curAnimation = ret.animations[ret.defaultAnimation];
      }
    }

    return ret;
  }

  startAnimation(animation: string) {
    if (this.image?.animations?.[animation]) {
      this.image.curAnimation = this.image.animations[animation];
      this.image.animationStartTime = 0;
    }
  }

  stopAnimation() {
    if (this.image) {
      delete this.image.curAnimation;
      this.image.animationStartTime = 0;
      if (this.image.defaultAnimation) {
        this.startAnimation(this.image.defaultAnimation);
      }
    }
  }

  drawImage(camera: DefaultCamera, image: RenderableImage) {
    camera.context.save();

    const offsetSize = image.offsetSize || [0, 0];
    const offsetPosition = image.offsetPosition || [0, 0];
    const clipPosition = image.clipPosition || [0, 0];
    const clipSize = image.clipSize || [0, 0];

    const diam = this.object.radius * 2;
    const ratioX = diam / offsetSize[0];
    const ratioY = diam / offsetSize[1];
    camera.context.rotate(image.rotation);
    camera.context.translate(
      -(this.object.radius + offsetPosition[0] * ratioX),
      -(this.object.radius + offsetPosition[1] * ratioY)
    );

    camera.context.drawImage(
      image.image,
      clipPosition[0],
      clipPosition[1],
      clipSize[0],
      clipSize[1],
      0,
      0,
      clipSize[0] * ratioX,
      clipSize[1] * ratioY
    );

    camera.context.restore();
  }

  _getFrame(image: RenderImage, curAnimation: RenderAnimation, animationTime: number) {
    let frame = 0;
    if (!image.animationStartTime) image.animationStartTime = animationTime;
    else
      frame = Math.floor(
        (animationTime - image.animationStartTime) * curAnimation.framesPerMillisecond
      );

    // Constrain frame to total animation frames.
    frame = curAnimation.getFrame(frame);

    return curAnimation.frames[frame];
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    camera.context.translate(this.object.position[0], this.object.position[1]);
    camera.context.rotate(this.object.rotation);

    if (this.image) {
      if (this.image.curAnimation) {
        this.drawImage(
          camera,
          this._getFrame(this.image, this.image.curAnimation, time.animationTime)
        );
      } else {
        this.drawImage(camera, this.image);
      }
    } else {
      camera.context.fillStyle = this.color;
      camera.context.beginPath();

      camera.context.arc(0, 0, this.object.radius, 0, Math2D.twoPi);
      camera.context.fill();
    }
  }
}
