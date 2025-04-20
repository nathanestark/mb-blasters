import { vec2, vec3, quat } from "gl-matrix";
import ShipBase, { ShipProperties as ShipBaseProperties } from "@shared/game/ship";
import Player from "./player";
import Bullet from "@shared/game/bullet";

interface ShipProperties extends ShipBaseProperties {}

export default class Ship extends ShipBase {
  owner: Player;

  _fireRecord: number = 0;
  _fireInterval?: NodeJS.Timeout;

  constructor(owner: Player, { ...superProps }: ShipProperties = {}) {
    super(owner, superProps);

    this.owner = owner;

    this._fireRecord = 0;
  }

  onDestroyed() {
    if (this._fireInterval) clearInterval(this._fireInterval);
    super.onDestroyed();
  }

  fire(on: boolean) {
    if (on && !this._firing) {
      this.fireNow();
      this._fireInterval = setInterval(() => {
        this.fireNow();
      }, 150);
    } else {
      this._firing = false;
      clearInterval(this._fireInterval);
    }
  }

  fireNow() {
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
    vec2.scale(velocity, velocity, 300);
    vec2.add(velocity, velocity, this.velocity);
    const bullet = new Bullet(this, {
      position: position,
      velocity: velocity
    });

    const game = this.game;
    game.addGameObject(bullet, this.parent);
    setTimeout(() => {
      if (!bullet.removed) game.removeGameObject(bullet);
    }, 500);
  }
}
