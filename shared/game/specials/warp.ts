import { quat, vec2, vec3 } from "gl-matrix";
import Special, { SerializedSpecial } from "./special";
import Ship, { OnOffEventContext } from "../ship";
import { Math2D, RefreshTime } from "star-engine";
import WorldBounds from "../worldBounds";
import { SerializedVec2, serializeVec2, deserializeVec2 } from "../network";

export interface SerializableWarp extends SerializedSpecial {
  _on: boolean;
  _ready: boolean;
  _jumping: boolean;
  _from: SerializedVec2;
  _to: SerializedVec2;
}

export default class Warp extends Special {
  _on: boolean = false;
  _ready: boolean = true;
  _started: number = 0;
  _ellapsed: number = 0;
  _jumping: boolean = false;

  _from: vec2 = vec2.create();
  _to: vec2 = vec2.create();

  constructor(owner: Ship, power: number) {
    super(owner, power);
    this.type = "warp";

    // Don't let them do other things while we're warming up or moving.
    this.owner.on("fire", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && (this._on || !!this._ellapsed);
    });
    this.owner.on("thrust", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && (this._on || !!this._ellapsed);
    });
    this.owner.on("rotateCounterClockwise", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && (this._on || !!this._ellapsed);
    });
    this.owner.on("rotateClockwise", (ship: Ship, context: OnOffEventContext) => {
      context.cancel = context.on && (this._on || !!this._ellapsed);
    });

    this.addSerializableProperty("_on", {
      deserialize: (sValue: boolean) => {
        if (sValue && !this._on && this.jumping) {
          this.jumping();
        }
        this._on = sValue;
      }
    });
    this.addSerializableProperty("_ready", {
      serialize: (value: boolean) => value && !this._jumping
    });
    this.addSerializableProperty("_from", {
      init: vec2.create,
      copy: vec2.copy,
      serialize: serializeVec2,
      deserialize: (source: SerializedVec2) => deserializeVec2((this as any)["_from"], source),
      equals: vec2.equals
    });
    this.addSerializableProperty("_to", {
      init: vec2.create,
      copy: vec2.copy,
      serialize: serializeVec2,
      deserialize: (source: SerializedVec2) => deserializeVec2((this as any)["_to"], source),
      equals: vec2.equals
    });
    this.addSerializableProperty("_jumping", {
      deserialize: (sValue: boolean) => {
        if (sValue && !this._jumping && this._to && this._from && this.jump) {
          this.jump();
        }
      }
    });
  }

  on() {
    if (!this._on && !this._jumping && this._ready) {
      this._on = true;
      this._ready = false;
      this._started = Date.now();

      // Stop firing
      this.owner.fire(false);
      // Stop thrusting
      this.owner.thrust(false);
      // Stop rotating
      this.owner.rotateClockwise(false);
      this.owner.rotateCounterClockwise(false);

      // Automatically turn it off after 0.5 - 5 seconds.
      const offDelay = (0.023 * this.power + 0.2) * 1000;
      setTimeout(() => this.off(), offDelay);

      // Can only use it once every 1 - 10 seconds.
      const readyDelay = (0.0002 * Math.pow(this.power, 2) - 0.11 * this.power + 10) * 1000;
      setTimeout(() => {
        this._ready = true;
      }, readyDelay);
    }
  }

  off() {
    if (this._on) {
      this._on = false;

      this._ellapsed = Date.now() - this._started;
      this._started = 0;
    }
  }

  jumping?(): void;
  jump?(): void;

  update(time: RefreshTime) {
    if (this.owner._destroying || this.owner.removed) return;

    if (this._ellapsed) {
      // Max time (and therefore distance) is 2500
      const dist = this._ellapsed;

      // Determine what direction we're facing.
      const temp = vec3.fromValues(dist, 0, 0);
      const rotQuat = quat.identity(quat.create());
      quat.rotateZ(rotQuat, rotQuat, this.owner.rotation);
      vec3.transformQuat(temp, temp, rotQuat);

      // Displace their position.
      vec2.copy(this._from, this.owner.position);
      vec2.add(this.owner.position, this.owner.position, vec2.fromValues(temp[0], temp[1]));

      // Test this position. If it is outside the world bounds, then we're randomizing
      const allBounds = this.owner.game.filter("world");
      if (allBounds.length > 0) {
        const bounds = allBounds[0] as WorldBounds;

        const points = Math2D.inflateBoundingBox(bounds.bounds, -this.owner.radius);

        // Find out if we've exited our bounding box.
        if (!Math2D.pointInBoundingBox(this.owner.position, points)) {
          // If not, randomize our new position.
          vec2.set(
            this.owner.position,
            points[0][0] + Math.random() * (points[1][0] - points[0][0]),
            points[0][1] + Math.random() * (points[1][1] - points[0][1])
          );
        }
      }
      vec2.copy(this._to, this.owner.position);

      this._ellapsed = 0;
      this._jumping = true;
      setTimeout(() => {
        this._jumping = false;
      }, 1000);
      if (this.owner.requestUpdate) this.owner.requestUpdate();
    }
  }
}
