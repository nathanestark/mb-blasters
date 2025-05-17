import { vec2 } from "gl-matrix";
import { GameObject, RefreshTime, SeededRNG } from "star-engine";
import DefaultCamera from "../defaultCamera";
import Game from "..";

export default class Dust extends GameObject {
  rng = new SeededRNG();
  _image: OffscreenCanvas | null = null;
  _lastCameraPos: vec2 = vec2.create();

  generate(): void {
    this._image = new OffscreenCanvas(500, 500);
    const context = this._image.getContext("2d") as OffscreenCanvasRenderingContext2D;

    context.fillStyle = "#888";

    context.beginPath();
    for (let i = 0; i < 50; i++) {
      const x = this.rng.range({ from: 0, to: 500, int: false });
      const y = this.rng.range({ from: 0, to: 500, int: false });

      context.rect(x, y, 1, 1);
    }
    context.closePath();
    context.fill();
  }

  draw(camera: DefaultCamera, time: RefreshTime): void {
    if (!this._image) return;

    const game = this._game as Game;
    if (game.worldBounds) {
      const bounds = game.worldBounds;
      camera.context.beginPath();
      camera.context.rect(bounds.position[0], bounds.position[1], bounds.size[0], bounds.size[1]);
      camera.context.closePath();
      camera.context.clip();
    }
    // Make it a sufficient size.
    const drawSize = vec2.fromValues(camera.size.width, camera.size.height);
    const pattern = camera.context.createPattern(this._image, "repeat") as CanvasPattern;

    // Determine the direction they should 'point' while moving.
    const dir = vec2.subtract(vec2.create(), this._lastCameraPos, camera.position);
    vec2.copy(this._lastCameraPos, camera.position);

    let mag = vec2.length(dir);
    vec2.normalize(dir, dir);
    vec2.negate(dir, dir);

    mag = Math.ceil(mag / 3);
    const dir1 = vec2.scale(vec2.create(), dir, 1);
    const dir2 = vec2.scale(vec2.create(), dir, 2);
    const dir3 = vec2.scale(vec2.create(), dir, 3);

    const patternMat = new DOMMatrix().translateSelf(-camera.position[0], -camera.position[1]);
    pattern.setTransform(patternMat);
    camera.context.translate(
      camera.position[0] - drawSize[0] / 2,
      camera.position[1] - drawSize[1] / 2
    );
    camera.context.globalAlpha = 0.5;
    camera.context.fillStyle = pattern;
    camera.context.beginPath();
    camera.context.rect(0, 0, drawSize[0], drawSize[1]);
    camera.context.closePath();
    camera.context.fill();

    // FireFix cannot do this efficiently.
    // For whatever reason, drawing this again over the same spot results
    // in a massive lag spike on Firefox.
    // Even attempting to not sure a pattern fill, and just drawing the
    // image in a loop results in the same: it will draw all the images
    // once effectivly, but once any overlap, performance drops!
    [dir1, dir2, dir3].forEach((dir, i) => {
      if (mag > i) {
        camera.context.globalAlpha = 0.5 - i * 0.1;
        patternMat.translateSelf(dir[0], dir[1]);
        camera.context.beginPath();
        camera.context.rect(0, 0, drawSize[0], drawSize[1]);
        camera.context.closePath();
        camera.context.fill();
      }
    });
  }
}
