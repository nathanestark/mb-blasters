import StarGenerator, { normalDistribution } from "./starGenerator";
import MilkywayGenerator from "./milkywayGenerator";
import { SeededRNG } from "star-engine";

const ctx: Worker = self as any;

interface BackgroundGeneratorProps {
  type: "default" | "cluster" | "milkyway";
  seed: number;
  size: [number, number];
  repeat: boolean | "x" | "y";
  density: number;
  rotation: number;
}

ctx.onmessage = (e: MessageEvent) => {
  const { type, seed, size, repeat, density, rotation } = e.data as BackgroundGeneratorProps;

  const rng = new SeededRNG(seed);
  let canvas: OffscreenCanvas;

  if (type == "milkyway") {
    canvas = new MilkywayGenerator({
      width: size[0],
      height: size[1],
      repeat: repeat,
      density: density,
      maxRadius: 3,
      distribution: {
        x: "uniform",
        y: (rng: SeededRNG) => {
          return normalDistribution(rng, 0.2);
        }
      },
      rotation: rotation
    }).generate(rng);
  } else if (type == "cluster") {
    canvas = new StarGenerator({
      width: size[0],
      height: size[1],
      repeat: repeat,
      density: density,
      distribution: { x: "normal", y: "normal" },
      rotation: rotation
    }).generate(rng);
  } else {
    canvas = new StarGenerator({
      width: size[0],
      height: size[1],
      repeat: repeat,
      density: density,
      rotation: rotation
    }).generate(rng);
  }

  ctx.postMessage({ image: canvas.transferToImageBitmap() }, []);
};
