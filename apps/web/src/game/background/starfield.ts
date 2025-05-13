import { vec2 } from "gl-matrix";

import { SeededRNG } from "star-engine";
import StarfieldBase, {
  SerializedStarfield,
  StarfieldType
} from "@shared/game/background/starfield";
import DefaultCamera from "../defaultCamera";
import { RefreshTime } from "star-engine";
import Game from "..";

import StarGenerator, { normalDistribution } from "./starGenerator";
import MilkywayGenerator from "./milkywayGenerator";

export { SerializedStarfield };

interface BackgroundGeneratorProps {
  type: StarfieldType;
  seed: number;
  size: [number, number];
  repeat: boolean | "x" | "y";
  density: number;
  rotation: number;
}

export default class Starfield extends StarfieldBase {
  _image: ImageBitmap | null = null;
  _showStartTime: number = 0;

  generate() {
    super.generate();

    // Don't wait for this to complete.
    this.generateStarfield();
  }

  async generateStarfield(): Promise<void> {
    const props: BackgroundGeneratorProps = {
      type: this.type,
      seed: this.rng.seed,
      size: [this.size[0], this.size[1]],
      repeat: this.repeat,
      density: this.density,
      rotation: this.rotation
    };

    const worker = new Worker(new URL("./backgroundGenerator.worker.ts", import.meta.url), {
      type: "module"
    });
    const promise = new Promise<void>((resolve) => {
      worker.onmessage = (e: MessageEvent) => {
        this._image = e.data.image as ImageBitmap;
        worker.terminate();
        resolve();
      };
    });
    worker.postMessage(props);

    return promise;
  }

  syncGenerateStarfield() {
    if (this.type == "milkyway") {
      this._image = new MilkywayGenerator({
        width: this.size[0],
        height: this.size[1],
        repeat: this.repeat,
        density: this.density,
        maxRadius: 3,
        distribution: {
          x: "uniform",
          y: (rng: SeededRNG) => {
            return normalDistribution(rng, 0.2);
          }
        },
        rotation: this.rotation
      })
        .generate(this.rng)
        .transferToImageBitmap();
    } else if (this.type == "cluster") {
      this._image = new StarGenerator({
        width: this.size[0],
        height: this.size[1],
        repeat: this.repeat,
        density: this.density,
        distribution: { x: "normal", y: "normal" },
        rotation: this.rotation
      })
        .generate(this.rng)
        .transferToImageBitmap();
    } else {
      this._image = new StarGenerator({
        width: this.size[0],
        height: this.size[1],
        repeat: this.repeat,
        density: this.density,
        rotation: this.rotation
      })
        .generate(this.rng)
        .transferToImageBitmap();
    }
  }

  draw(camera: DefaultCamera, time: RefreshTime) {
    if (!this._image) return;

    if (!this._showStartTime) {
      this._showStartTime = time.animationTime;
    }

    const game = this._game as Game;

    camera.context.save();

    // Fade in our stars after we have them generated.
    const fadeIn = (time.animationTime - this._showStartTime) / 3000;
    if (fadeIn < 1) {
      camera.context.filter = `opacity(${Math.floor(fadeIn * 100)}%)`;
    }

    if (game.worldBounds) {
      const bounds = game.worldBounds;
      camera.context.beginPath();
      camera.context.rect(bounds.position[0], bounds.position[1], bounds.size[0], bounds.size[1]);
      camera.context.clip();
    }

    if (this.repeat) {
      // Make it a sufficient size.
      const width = this.repeat == "y" ? this._image.width : (camera.size.width * 10) / this.depth;
      const height =
        this.repeat == "x" ? this._image.height : (camera.size.height * 10) / this.depth;
      const drawSize = vec2.fromValues(width, height);
      const patternRepeat =
        this.repeat == true ? "repeat" : this.repeat == "x" ? "repeat-x" : "repeat-y";
      const pattern = camera.context.createPattern(this._image, patternRepeat) as CanvasPattern;

      // Negate camera position, add depth
      const drawPos = vec2.scale(vec2.create(), camera.position, this.depth);
      // Add our obj's position.
      vec2.add(drawPos, drawPos, this.position);

      // Position it.
      camera.context.translate(drawPos[0], drawPos[1]);
      // Rotate.
      camera.context.rotate(this.rotation);
      camera.context.translate(drawSize[0] / -2, drawSize[1] / -2);

      camera.context.fillStyle = pattern;
      camera.context.fillRect(0, 0, drawSize[0], drawSize[1]);
    } else {
      // Negate camera position, add depth
      const drawPos = vec2.scale(vec2.create(), camera.position, this.depth);
      // Add our obj's position.
      vec2.add(drawPos, drawPos, this.position);

      // Position it.
      camera.context.translate(drawPos[0], drawPos[1]);

      // Rotate.
      camera.context.rotate(this.rotation);
      camera.context.translate(this.size[0] / -2, this.size[1] / -2);

      camera.context.drawImage(this._image, 0, 0);
    }
    camera.context.restore();
  }

  static from(sObj: SerializedStarfield): Starfield {
    const obj = new Starfield({ size: vec2.create() });
    obj._id = sObj.id;
    obj.deserialize(sObj, true);

    obj.generate();

    return obj;
  }
}
