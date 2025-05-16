import { vec2, vec3, quat } from "gl-matrix";
import ShipBase, {
  OnOffEventContext,
  ShipProperties as ShipBaseProperties
} from "@shared/game/ship";
import Player from "./player";
import Bullet from "@shared/game/bullet";
import Explosion from "@shared/game/explosion";
import Game from ".";

interface ShipProperties extends ShipBaseProperties {}

export default class Ship extends ShipBase {
  owner: Player;

  _fireRecord: number = 0;
  _fireCount: number = 0;
  _fireInterval?: NodeJS.Timeout;

  constructor(owner: Player, { ...superProps }: ShipProperties = {}) {
    super(owner, superProps);

    this.owner = owner;

    this._fireRecord = 0;

    this.once("destroying", this.handleDestroying.bind(this));
    this.on("fire", (_this, context: OnOffEventContext) => this.handleFire(context));
  }

  handleDestroying() {
    if (this._fireInterval) clearInterval(this._fireInterval);
    const explosion = new Explosion({
      type: "shipexplosion",
      position: vec2.clone(this.position),
      rotation: 0,
      velocity: vec2.fromValues(0, 0)
    });
    this.game.addGameObject(explosion);
  }

  fire(on: boolean) {
    if (this.removed || this._destroying) return;

    const context: OnOffEventContext = { on, cancel: false };
    this.emit("fire", this, context);
    if (!context.cancel) this._firing = on;
  }

  handleFire(context: OnOffEventContext) {
    if (!context.cancel) {
      if (context.on && !this._firing) {
        const fireModeFn = (
          {
            burst: this.fireBurst,
            single: this.fireSingle,
            double: this.fireDouble,
            doubleAlt: this.fireDoubleAlt,
            shot: this.fireShot
          }[this._fireMode] || this.fireBurst
        ).bind(this);

        fireModeFn();
      } else {
        this._firing = false;
        clearInterval(this._fireInterval);
      }
    }
  }

  fireBurst() {
    const fire = () => {
      if (this._destroying) return;

      if (this._fireRecord >= 3) return;
      this._fireRecord++;
      setTimeout(() => {
        this._fireRecord--;
      }, 1000);
      this.fireBullet();
    };

    fire();
    this._fireInterval = setInterval(fire, 125);
  }

  fireSingle() {
    const fire = () => {
      if (this._destroying) return;

      if (this._fireRecord >= 4) return;
      this._fireRecord++;
      setTimeout(() => {
        this._fireRecord--;
      }, 1000);
      this.fireBullet();
    };

    fire();
    this._fireInterval = setInterval(fire, 250);
  }

  fireDouble() {
    const fire = () => {
      if (this._destroying) return;

      if (this._fireRecord >= 1) return;
      this._fireCount++;
      this._fireRecord++;
      setTimeout(() => {
        this._fireRecord--;
      }, 250);
      this.fireBullet(
        vec2.fromValues(this.radius * 0.25, (1 - (this._fireCount % 2) * 2) * this.radius * 0.75)
      );
    };

    fire();
    this._fireInterval = setInterval(fire, 250);
  }

  fireDoubleAlt() {
    const fire = () => {
      if (this._destroying) return;

      if (this._fireRecord >= 1) return;
      this._fireRecord++;
      setTimeout(() => {
        this._fireRecord--;
      }, 500);
      for (let x = 0; x < 2; x++) {
        this._fireCount++;
        this.fireBullet(
          vec2.fromValues(this.radius * 0.25, (1 - (this._fireCount % 2) * 2) * this.radius * 0.75)
        );
      }
    };

    fire();
    this._fireInterval = setInterval(fire, 500);
  }

  fireShot() {
    const fire = () => {
      if (this._destroying) return;

      if (this._fireRecord >= 1) return;
      this._fireRecord++;
      setTimeout(() => {
        this._fireRecord--;
      }, 1000);
      const diff = Math.PI / 16;
      const total = 4;
      const start = (diff * (total + -1)) / -2;
      for (let x = 0; x < total; x++) {
        this._fireCount++;
        this.fireBullet(null, start + diff * x);
      }
    };

    fire();
    this._fireInterval = setInterval(fire, 1000);
  }

  fireBullet(offset: vec2 | null = null, rot: number = 0) {
    if (!offset) offset = vec2.fromValues(this.radius, 0);

    const position = vec2.rotate(vec2.create(), offset, [0, 0], this.rotation);
    vec2.add(position, position, this.position);
    const velocity = vec2.rotate(vec2.create(), [1, 0], [0, 0], this.rotation + rot);

    vec2.scale(velocity, velocity, this._bulletSpeed);
    vec2.add(velocity, velocity, this.velocity);
    const bullet = new Bullet(this, {
      position: position,
      velocity: velocity
    });

    const game = this.game;
    if (game) {
      game.addGameObject(bullet, this.parent);
      setTimeout(() => {
        if (!bullet.removed) {
          game.removeGameObject(bullet);
        }
      }, 500);
    }
  }

  requestUpdate(options?: { noLerping: boolean }) {
    (this.game as Game)._networkUpdate.requestUpdate(
      this,
      options?.noLerping ? "noLerp" : "default"
    );
  }
}
