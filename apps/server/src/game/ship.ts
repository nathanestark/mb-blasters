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
        this.fireNow();
        this._fireInterval = setInterval(() => {
          this.fireNow();
        }, 150);
      } else {
        this._firing = false;
        clearInterval(this._fireInterval);
      }
    }
  }

  fireNow() {
    if (this._destroying) return;

    if (this._fireRecord >= 4) return;
    this._fireRecord++;
    setTimeout(() => {
      this._fireRecord--;
    }, 1000);

    const temp = vec3.fromValues(1, 0, 0);
    const rotQuat = quat.identity(quat.create());
    quat.rotateZ(rotQuat, rotQuat, this.rotation);
    vec3.transformQuat(temp, temp, rotQuat);

    const position = vec2.clone(this.position);
    const velocity = vec2.fromValues(temp[0], temp[1]);
    vec2.add(position, position, vec2.scale(vec2.create(), velocity, this.radius));
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
