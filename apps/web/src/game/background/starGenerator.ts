import { Math2D, SeededRNG, hslToRgb } from "star-engine";

export interface StarGeneratorProps {
  width?: number;
  height?: number;
  repeat?: boolean | "x" | "y";
  padding?: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  density?: number;
  minRadius?: number;
  maxRadius?: number;
  flareRadius?: number;
  starBlur?: number;
  starImpact?: number;
  haloBlur?: number;
  haloImpact?: number;
  fieldBlur?: number;
  fieldImpact?: number;
  gradientFillSizeLimit?: number;
  distribution?: {
    x: Distribution | ((rng: SeededRNG) => number);
    y: Distribution | ((rng: SeededRNG) => number);
  };
  rotation?: number;
  getColor?: (rng: SeededRNG) => { r: number; g: number; b: number };
}

export type Distribution = "normal" | "uniform" | "quadradic" | "cubic";

function isUndefined(v: undefined | any) {
  return typeof v === "undefined";
}

export function normalDistribution(rng: SeededRNG, stdev: number): number {
  let u1 = 1 - rng.random();
  const u2 = rng.random() * Math2D.twoPi;

  const mag = Math.sqrt(-2 * Math.log(u1));
  const raw = mag * Math.cos(u2);
  // Force it to fit inside -1 to 1,
  // then shift it back to 0 to 1
  return Math.max(-1, Math.min(1, raw * stdev)) * 0.5 + 0.5;
}

class StarGenerator {
  width = 100;
  height = 100;
  repeat: boolean | "x" | "y" = false;
  padding = {
    top: 20,
    left: 20,
    bottom: 20,
    right: 20
  };
  density = 0.001;
  minRadius = 0.1;
  maxRadius = 2.5;
  flareRadius = 1.75;
  starBlur = 0;
  starImpact = 1;
  haloBlur = 5;
  haloImpact = 1;
  fieldBlur = 20;
  fieldImpact = 4;
  gradientFillSizeLimit = 1;
  distribution: {
    x: Distribution | ((rng: SeededRNG) => number);
    y: Distribution | ((rng: SeededRNG) => number);
  } = {
    x: "uniform",
    y: "uniform"
  };
  rotation = 0;

  _paddedWidth: number;
  _paddedHeight: number;
  _drawWidth: number;
  _drawHeight: number;

  constructor(props: StarGeneratorProps) {
    // Normalize parameters
    if (!isUndefined(props.width)) this.width = props.width;
    if (!isUndefined(props.height)) this.height = props.height;
    if (!isUndefined(props.repeat)) this.repeat = props.repeat;
    if (!isUndefined(props.padding)) {
      if (!isUndefined(props.padding.top)) this.padding.top = props.padding.top;
      if (!isUndefined(props.padding.left)) this.padding.left = props.padding.left;
      if (!isUndefined(props.padding.bottom)) this.padding.bottom = props.padding.bottom;
      if (!isUndefined(props.padding.right)) this.padding.right = props.padding.right;

      // Don't let padding exceed the size of the field.
      // We always want our resulting images to have a size of at least 1x1
      const xLeft = props.padding!.left + props.padding!.right - props.width! + 1;
      if (xLeft > 0) {
        props.padding!.left -= Math.ceil(xLeft / 2);
        props.padding!.right -= Math.floor(xLeft / 2);
      }
      const yLeft = props.padding!.top + props.padding!.bottom - props.height! + 1;
      if (yLeft > 0) {
        props.padding!.top -= Math.ceil(yLeft / 2);
        props.padding!.bottom -= Math.floor(yLeft / 2);
      }
    }
    if (!isUndefined(props.density)) this.density = props.density;
    if (!isUndefined(props.minRadius)) this.minRadius = props.minRadius;
    if (!isUndefined(props.maxRadius)) this.maxRadius = props.maxRadius;
    if (!isUndefined(props.flareRadius)) this.flareRadius = props.flareRadius;
    if (!isUndefined(props.starBlur)) this.starBlur = props.starBlur;
    if (!isUndefined(props.starImpact)) this.starImpact = props.starImpact;
    if (!isUndefined(props.haloBlur)) this.haloBlur = props.haloBlur;
    if (!isUndefined(props.haloImpact)) this.haloImpact = props.haloImpact;
    if (!isUndefined(props.fieldBlur)) this.fieldBlur = props.fieldBlur;
    if (!isUndefined(props.fieldImpact)) this.fieldImpact = props.fieldImpact;
    if (!isUndefined(props.gradientFillSizeLimit))
      this.gradientFillSizeLimit = props.gradientFillSizeLimit;

    if (!isUndefined(props.distribution)) {
      if (!isUndefined(props.distribution.x)) this.distribution.x = props.distribution.x;
      if (!isUndefined(props.distribution.y)) this.distribution.y = props.distribution.y;
    }
    if (!isUndefined(props.rotation)) this.rotation = props.rotation;
    if (!isUndefined(props.getColor)) this.getColor = props.getColor;

    this._paddedWidth =
      this.repeat == true || this.repeat == "x"
        ? this.width + this.padding.left + this.padding.right
        : this.width;
    this._paddedHeight =
      this.repeat == true || this.repeat == "y"
        ? this.height + this.padding.top + this.padding.bottom
        : this.height;
    this._drawWidth = this._paddedWidth - (this.padding.left + this.padding.right);
    this._drawHeight = this._paddedHeight - (this.padding.top + this.padding.bottom);
  }

  private getColor: (rng: SeededRNG) => { r: number; g: number; b: number } = (rng) => {
    // 0 - 60, 180 - 240
    let h = rng.range(0, 120);
    h = h >= 60 ? h + 120 : h;

    const [r, g, b] = hslToRgb(
      h / 360,
      rng.range({ from: 0, to: 1, int: false }),
      rng.range({ from: 0.7, to: 1, int: false })
    );
    return { r, g, b };
  };

  private getRadius(min: number, max: number, val: number) {
    var log = 1000;
    val = 1 + val * (log - 1);
    var curve = 1 - Math.log(val) / Math.log(log);
    return min + curve * (max - min);
  }

  /** Distribution functions */
  private uniform(rng: SeededRNG): number {
    return rng.random();
  }
  private quadradic(rng: SeededRNG) {
    const u2 = rng.random() * Math2D.twoPi;
    const mag = Math.pow(rng.random(), 2);
    const dir = Math.cos(u2) < 0 ? -1 : 1;
    return mag * dir * 0.5 + 0.5;
  }
  private cubic(rng: SeededRNG) {
    return Math.pow(2 * rng.random() - 1, 3) * 0.5 + 0.5;
  }
  private normal(rng: SeededRNG) {
    return normalDistribution(rng, 0.3);
  }

  private getDistMode(dir: "x" | "y") {
    const distMode: Record<Distribution, (rng: SeededRNG) => number> = {
      uniform: this.uniform,
      quadradic: this.quadradic,
      cubic: this.cubic,
      normal: this.normal
    };

    const distType = this.distribution[dir];
    let mode: undefined | ((rng: SeededRNG) => number);

    if (typeof distType === "function") {
      mode = distType;
    } else mode = distMode[distType];

    if (!mode) return distMode["uniform"];
    return mode;
  }

  generate(rng: SeededRNG) {
    // Create a hidden canvas to work on
    const originalCanvas = new OffscreenCanvas(this._paddedWidth, this._paddedHeight);
    const context = originalCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

    // Draw the stars
    this.drawStars(context, rng);

    // Create halo blur
    const haloCanvas =
      this.haloImpact && this.haloBlur
        ? this.createBlurCanvas(originalCanvas, this.haloBlur)
        : null;

    // Create field blur
    const fieldCanvas =
      this.fieldImpact && this.fieldBlur
        ? this.createBlurCanvas(originalCanvas, this.fieldBlur)
        : null;

    // Create star blur
    const starCanvas = this.starImpact
      ? this.createBlurCanvas(originalCanvas, this.starBlur)
      : null;

    // Create our master to copy everything to.
    const masterCanvas = new OffscreenCanvas(this.width, this.height);
    const masterContext = masterCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

    if (haloCanvas) this.drawStarLayer(haloCanvas, masterContext, this.haloImpact);
    if (fieldCanvas) this.drawStarLayer(fieldCanvas, masterContext, this.fieldImpact);
    if (starCanvas) this.drawStarLayer(starCanvas, masterContext, this.starImpact);

    return masterCanvas;
  }

  private drawStars(context: OffscreenCanvasRenderingContext2D, rng: SeededRNG) {
    const vol = this._drawWidth * this._drawHeight;
    const numStars = vol * this.density;

    var xMode = this.getDistMode("x");
    var yMode = this.getDistMode("y");

    for (var i = 0; i < numStars; i++) {
      var xMin = this.padding.left;
      var xWidth = this._drawWidth;
      var yMin = this.padding.top;
      var yHeight = this._drawHeight;

      var x = xMin + xMode(rng) * xWidth;
      var y = yMin + yMode(rng) * yHeight;

      var rawR = this.getRadius(this.minRadius, this.maxRadius, rng.random());
      var r = Math.max(1, rawR);

      // Adjust location based on radius.
      // We never want it to spill over our edges.
      x = Math.max(xMin + rawR, Math.min(xMin + xWidth - rawR, x));
      y = Math.max(yMin + rawR, Math.min(yMin + yHeight - rawR, y));

      var color = this.getColor(rng);
      var a = Math.min(rawR, 1);
      var sColor = "rgba(" + color.r + "," + color.g + "," + color.b + "," + a + ")";

      context.save();
      context.translate(x, y);
      if (r > 1) {
        context.beginPath();
        context.arc(0, 0, r, 0, 360);
        if (r > this.gradientFillSizeLimit) {
          var grd = context.createRadialGradient(0, 0, 0, 0, 0, r);
          grd.addColorStop(0, "#ffffff");
          grd.addColorStop(1, sColor);
          context.fillStyle = grd;
        } else {
          context.fillStyle = sColor;
        }
        context.fill();

        // Add a flash.
        context.save();

        // Star
        context.fillStyle = "rgba(255,255,255,0.5)";
        // context.filter = `blur(1px)`;
        if (r > this.flareRadius) {
          context.rotate(-this.rotation);
          context.beginPath();
          context.moveTo(-(r - 2) * 32, 0);
          context.lineTo(0, 1);
          context.lineTo((r - 2) * 32, 0);
          context.lineTo(0, -1);
          context.fill();

          context.beginPath();
          context.moveTo(0, -(r - 2) * 16);
          context.lineTo(-1, 0);
          context.lineTo(0, (r - 2) * 16);
          context.lineTo(1, 0);
          context.fill();
        }
        context.restore();
      } else {
        context.fillStyle = sColor;
        context.fillRect(0, 0, 1, 1);
      }
      context.restore();
    }
  }

  private createBlurCanvas(canvas: OffscreenCanvas, blur: number) {
    // Create first blur canvas
    const blurCanvas = new OffscreenCanvas(this._paddedWidth, this._paddedHeight);
    const blurContext = blurCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

    if (blur > 0) blurContext.filter = `blur(${blur}px)`;
    blurContext.drawImage(canvas, 0, 0);
    return blurCanvas;
  }

  private drawWrappingEdge(
    sourceCanvas: OffscreenCanvas,
    destContext: OffscreenCanvasRenderingContext2D
  ) {
    if (this.repeat == true || this.repeat == "y") {
      const pLeft = this.repeat == true ? this.padding.left : 0;

      // Print bottom padding on top.
      destContext.drawImage(
        sourceCanvas,
        pLeft,
        this._paddedHeight - this.padding.bottom,
        this.width,
        this.padding.bottom,
        0,
        0,
        this.width,
        this.padding.bottom
      );
      // Print top padding on bottom.
      destContext.drawImage(
        sourceCanvas,
        pLeft,
        0,
        this.width,
        this.padding.top,
        0,
        this.height - this.padding.top,
        this.width,
        this.padding.top
      );
    }
    if (this.repeat == true || this.repeat == "x") {
      const pTop = this.repeat == true ? this.padding.top : 0;

      // Print right padding on left.
      destContext.drawImage(
        sourceCanvas,
        this._paddedWidth - this.padding.right,
        pTop,
        this.padding.right,
        this.height,
        0,
        0,
        this.padding.right,
        this.height
      );
      // Print left padding on right.
      destContext.drawImage(
        sourceCanvas,
        0,
        pTop,
        this.padding.left,
        this.height,
        this.width - this.padding.left,
        0,
        this.padding.left,
        this.height
      );

      destContext.restore();
    }
    if (this.repeat == true) {
      // Print bottom-right corner to top-left
      destContext.drawImage(
        sourceCanvas,
        this._paddedWidth - this.padding.right,
        this._paddedHeight - this.padding.bottom,
        this.padding.right,
        this.padding.bottom,
        0,
        0,
        this.padding.right,
        this.padding.bottom
      );
      // Print bottom-left corner to top-right
      destContext.drawImage(
        sourceCanvas,
        0,
        this._paddedHeight - this.padding.bottom,
        this.padding.left,
        this.padding.bottom,
        this.width - this.padding.left,
        0,
        this.padding.left,
        this.padding.bottom
      );
      // Print top-right corner to bottom-left
      destContext.drawImage(
        sourceCanvas,
        this._paddedWidth - this.padding.right,
        0,
        this.padding.right,
        this.padding.top,
        0,
        this.height - this.padding.top,
        this.padding.right,
        this.padding.top
      );
      // Print top-left corner to bottom-right
      destContext.drawImage(
        sourceCanvas,
        0,
        0,
        this.padding.left,
        this.padding.top,
        this.width - this.padding.left,
        this.height - this.padding.top,
        this.padding.left,
        this.padding.top
      );
    }
  }

  private drawStarLayer(
    sourceCanvas: OffscreenCanvas,
    destContext: OffscreenCanvasRenderingContext2D,
    impact: number
  ) {
    for (var x = 0; x < impact; x++) {
      if (this.repeat) {
        destContext.drawImage(
          sourceCanvas,
          this.repeat == true || this.repeat == "x" ? -this.padding.left : 0,
          this.repeat == true || this.repeat == "y" ? -this.padding.top : 0
        );
        // Draw padding overlap to opposite sides.
        this.drawWrappingEdge(sourceCanvas, destContext);
      } else destContext.drawImage(sourceCanvas, 0, 0);
    }
  }
}

export default StarGenerator;
