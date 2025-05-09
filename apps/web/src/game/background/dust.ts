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

    for (let i = 0; i < 20; i++) {
      const x = this.rng.range(0, 500);
      const y = this.rng.range(0, 500);

      context.fillRect(x + 0.25, y + 0.25, 1, 1);
    }
  }

  draw(camera: DefaultCamera, time: RefreshTime): void {
    if (!this._image) return;

    const game = this._game as Game;
    if (game.worldBounds) {
      const bounds = game.worldBounds;
      camera.context.beginPath();
      camera.context.rect(bounds.position[0], bounds.position[1], bounds.size[0], bounds.size[1]);
      camera.context.clip();
    }
    // Make it a sufficient size.
    const drawSize = vec2.fromValues(camera.size.width * 10, camera.size.height * 10);
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

    camera.context.translate(drawSize[0] / -2, drawSize[1] / -2);
    const filter = [`opacity(50%)`];
    if (mag > 0) filter.push(`drop-shadow(${dir1[0]}px ${dir1[1]}px  1px #888)`);
    if (mag > 1) filter.push(`drop-shadow(${dir2[0]}px ${dir2[1]}px  2px #888)`);
    if (mag > 2) filter.push(`drop-shadow(${dir3[0]}px ${dir3[1]}px  3px #888)`);

    camera.context.filter = filter.join(" ");
    camera.context.fillStyle = pattern;
    camera.context.fillRect(0, 0, drawSize[0], drawSize[1]);
  }
}
