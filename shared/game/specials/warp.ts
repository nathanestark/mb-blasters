import { quat, vec2, vec3 } from "gl-matrix";
import Special, { SerializableSpecial } from "./special";
import Ship, { OnOffEventContext } from "../ship";
import { Math2D } from "star-engine";
import WorldBounds from "../worldBounds";
import { SerializedVec2, serializeVec2, deserializeVec2 } from "../network";

export interface SerializableWarp extends SerializableSpecial {
  on: boolean;
  ready: boolean;
  jumping: boolean;
  from?: SerializedVec2;
  to?: SerializedVec2;
}

export default class Warp extends Special {
  _on: boolean = false;
  _ready: boolean = true;
  _started: number = 0;
  _ellapsed: number = 0;
  _jumping: boolean = false;

  _from?: vec2;
  _to?: vec2;

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

  update(tDelta: number) {
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
      this._from = vec2.copy(vec2.create(), this.owner.position);
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
      this._to = vec2.copy(vec2.create(), this.owner.position);

      this._ellapsed = 0;
      this._jumping = true;
      setTimeout(() => {
        this._jumping = false;
      }, 1000);
    }
  }

  serialize(): SerializableWarp {
    const obj = super.serialize();
    return {
      ...obj,
      on: this._on,
      ready: this._ready && !this.jumping,
      jumping: this._jumping,
      from: this._from ? serializeVec2(this._from) : undefined,
      to: this._to ? serializeVec2(this._to) : undefined
    };
  }

  deserialize(obj: SerializableWarp) {
    super.deserialize(obj);

    if (obj.on && !this._on && this.jumping) {
      this.jumping();
    }
    this._on = obj.on;
    this._ready = obj.ready;
    if (obj.from) {
      const newFrom = this._from || vec2.create();
      deserializeVec2(newFrom, obj.from);
      this._from = newFrom;
    } else {
      delete this._from;
    }
    if (obj.to) {
      const newTo = this._to || vec2.create();
      deserializeVec2(newTo, obj.to);
      this._to = newTo;
    } else {
      delete this._to;
    }
    if (obj.jumping && !this._jumping && this._to && this._from && this.jump) {
      this.jump();
    }
  }
}
