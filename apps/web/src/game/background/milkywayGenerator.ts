import { SeededRNG, hslToRgb } from "star-engine";
import StarGenerator, { StarGeneratorProps, normalDistribution } from "./starGenerator";

class MilkywayGenerator extends StarGenerator {
  glowGenerator: StarGenerator;
  dustGenerator: StarGenerator;
  ldStarGenerator: StarGenerator;

  constructor(props: StarGeneratorProps) {
    super(props);

    // Adjust original props's padding for blur?
    // let blur = hdProps.starBlur!;
    // if (hdProps.haloBlur! > blur) blur = hdProps.haloBlur!;
    // if (hdProps.fieldBlur! > blur) blur = hdProps.fieldBlur!;

    // hdProps.padding!.top += blur * 1.5;
    // hdProps.padding!.bottom += blur * 1.5;

    // Create generators for our glow, dust and low density stars
    this.glowGenerator = new StarGenerator({
      ...props,
      density: this.density / 2,
      minRadius: 1,
      maxRadius: 5,
      flareRadius: 6,
      starBlur: 3,
      starImpact: 2,
      haloBlur: 5,
      haloImpact: 2,
      fieldBlur: 10,
      fieldImpact: 1,
      gradientFillSizeLimit: 10,
      getColor: (rng: SeededRNG) => {
        let h = rng.range(30, 50);

        const [r, g, b] = hslToRgb(
          h / 360,
          rng.range({ from: 0.9, to: 1, int: false }),
          rng.range({ from: 0.68, to: 1, int: false })
        );
        return { r, g, b };
      },
      distribution: {
        x: this.distribution.x,
        y: (rng: SeededRNG) => normalDistribution(rng, 0.025)
      }
    });
    this.dustGenerator = new StarGenerator({
      ...props,
      density: this.density * 2,
      minRadius: 0.5,
      maxRadius: 5,
      flareRadius: 6,
      starBlur: 1,
      starImpact: 3,
      haloBlur: 5,
      haloImpact: 2,
      fieldBlur: 20,
      fieldImpact: 0,
      gradientFillSizeLimit: 10,
      getColor: (rng: SeededRNG) => {
        let h = rng.range(230, 250);

        const [r, g, b] = hslToRgb(
          h / 360,
          rng.range({ from: 0.2, to: 0.5, int: false }),
          rng.range({ from: 0, to: 0.12, int: false })
        );
        return { r, g, b };
      },
      distribution: {
        x: this.distribution.x,
        y: (rng: SeededRNG) => normalDistribution(rng, 0.04)
      }
    });
    this.ldStarGenerator = new StarGenerator({
      ...props,
      density: this.density / 2,
      distribution: {
        x: this.distribution.x,
        y: (rng: SeededRNG) => normalDistribution(rng, 0.3)
      }
    });
  }

  generate(rng: SeededRNG) {
    const hdStars = super.generate(rng);
    const glow = this.glowGenerator.generate(rng);
    const dust = this.adjustLevels(this.dustGenerator.generate(rng));
    const ldStars = this.ldStarGenerator.generate(rng);

    // Create Master canvas
    var masterCanvas = new OffscreenCanvas(this.width, this.height);
    var masterContext = masterCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

    // Draw our layers.
    masterContext.drawImage(hdStars, 0, 0);
    masterContext.drawImage(glow, 0, 0);

    masterContext.save();
    masterContext.filter =
      "blur(1.5px) drop-shadow(0 0 1px rgb(41,18,20)) drop-shadow(0 0 3px rgb(41,18,20))";
    masterContext.drawImage(dust, 0, 0);
    masterContext.restore();

    masterContext.drawImage(ldStars, 0, 0);

    return masterCanvas;
  }

  private adjustLevels(canvas: OffscreenCanvas) {
    const context = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    const data = context.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < data.data.length; i += 4) {
      // Adjust levels of alpha.
      let a = data.data[i + 3];

      if (a > 250) a = 250;
      else if (a > 200) a = ((a - 200) * 250) / 50;
      else a = 0;
      data.data[i + 3] = Math.max(0, Math.min(255, a));
    }

    context.putImageData(data, 0, 0);

    return canvas;
  }
}

export default MilkywayGenerator;
