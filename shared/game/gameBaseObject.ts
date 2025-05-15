import { vec2 } from "gl-matrix";
import { GameObject2D, GameObject, RefreshTime } from "star-engine";
import {
  NetworkObject,
  SerializedVec2,
  NetworkSerializable,
  NetworkDeserializable,
  serializeVec2,
  deserializeVec2,
  SerializableProperty,
  hasPreviousStateChanged,
  setPreviousState,
  addSerializableProperty,
  serializeSerializables,
  deserializeSerializables
} from "./network";

export interface SerializedGameBaseObject extends NetworkObject {
  position?: SerializedVec2;
  velocity?: SerializedVec2;
  totalForce?: SerializedVec2;
  rotation?: number;
  radius?: number;
  mass?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

export interface GameBaseObjectProperties {
  position?: vec2;
  velocity?: vec2;
  rotation?: number;
  radius?: number;
  mass?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

export interface IGameBaseObject {
  position: vec2;
  velocity: vec2;
  totalForce: vec2;
  rotation: number;
  radius: number;
  mass: number;
  minSpeed: number;
  maxSpeed: number;
  removed: boolean;
}

export default class GameBaseObject
  extends GameObject
  implements GameObject2D, NetworkSerializable, NetworkDeserializable, IGameBaseObject
{
  position: vec2 = vec2.create();
  velocity: vec2 = vec2.create();
  totalForce: vec2 = vec2.create();
  rotation: number = 0;
  radius: number = 1;
  mass: number = 1;
  minSpeed: number = 0.1;
  maxSpeed: number = 1000000;
  removed: boolean = false;

  classTags: Array<string> = [];

  serverPosition: vec2 = vec2.create();
  serverTargetLastUpdateTime: number = 0;
  serverLerpProgress: number = 0;
  initializeFromServer: boolean = false;

  serializable: Array<SerializableProperty> = [];
  _previousState: Record<string, any> = {};

  constructor({
    position,
    velocity,
    rotation,
    radius,
    mass,
    minSpeed,
    maxSpeed
  }: GameBaseObjectProperties = {}) {
    super();

    this.classTags = ["gamebase", "gamebaseObject", "network", "networkF1"];

    if (position) this.position = position;
    if (velocity) this.velocity = velocity;
    if (typeof rotation == "number") this.rotation = rotation;
    if (typeof radius == "number") this.radius = radius;
    if (typeof mass == "number") this.mass = mass;
    if (typeof minSpeed == "number") this.minSpeed = minSpeed;
    if (typeof maxSpeed == "number") this.maxSpeed = maxSpeed;

    this.serverPosition = vec2.clone(this.position);

    this.addSerializableVec2Property("position", {
      optional: false,
      deserialize: (source: SerializedVec2, initialize?: boolean) => {
        if (initialize) deserializeVec2(this.position, source);
        this.initializeFromServer = !!initialize;
        deserializeVec2(this.serverPosition, source);
      }
    });
    this.addSerializableVec2Property("velocity", { optional: false });
    this.addSerializableVec2Property("totalForce");
    this.addSerializableProperty("rotation");
    this.addSerializableProperty("radius");
    this.addSerializableProperty("mass");
    this.addSerializableProperty("minSpeed");
    this.addSerializableProperty("maxSpeed");
  }

  gameObjectAdded(): void {
    this.setPreviousState();
  }

  update(time: RefreshTime) {
    const serverTimeAdvance = (time.curTime - this.serverTargetLastUpdateTime) / 1000;
    const performLerp = this.serverTargetLastUpdateTime > 0 && this.serverLerpProgress < 1;
    if (performLerp) {
      if (this.initializeFromServer) {
        this.serverLerpProgress = 1;
        this.initializeFromServer = false;
      } else {
        this.serverLerpProgress = Math.min(1, this.serverLerpProgress + time.timeAdvance * 5);
      }
    }

    // Apply our total force to our velocities.
    if (this.mass > 0) {
      vec2.scale(this.totalForce, this.totalForce, time.timeAdvance / this.mass);
    }

    vec2.add(this.velocity, this.velocity, this.totalForce);

    const sqrSpeed = this.clampSpeed(this.velocity);

    // Apply our velocity to our position, but don't destroy velocity.
    let serverPosition = null;
    if (performLerp) {
      serverPosition = vec2.clone(this.serverPosition);
    }

    if (sqrSpeed > 0) {
      const vel = vec2.clone(this.velocity);
      vec2.scale(vel, vel, time.timeAdvance);
      vec2.add(this.position, this.position, vel);

      if (performLerp) {
        vec2.scale(vel, vec2.clone(this.velocity), serverTimeAdvance);
        vec2.add(serverPosition!, serverPosition!, vel);
      }
    }

    // Lerp Position
    if (performLerp) {
      vec2.lerp(this.position, this.position, serverPosition!, this.serverLerpProgress);
    }

    // Reset force.
    this.totalForce = vec2.create();
  }

  private clampSpeed(velocity: vec2) {
    let sqrSpeed = vec2.sqrLen(velocity);
    // Check if our velocity falls below epsilon.
    if (sqrSpeed <= this.minSpeed * this.minSpeed) {
      vec2.set(velocity, 0, 0);
      sqrSpeed = 0;
    }
    // Or above
    else if (sqrSpeed > this.maxSpeed * this.maxSpeed) {
      // Cap our speed.
      vec2.scale(velocity, vec2.normalize(velocity, velocity), this.maxSpeed);
    }
    return sqrSpeed;
  }

  get hasChanged(): boolean {
    return hasPreviousStateChanged(this.serializable, this._previousState, this);
  }

  setPreviousState() {
    setPreviousState(this.serializable, this._previousState, this);
  }

  onClientRemove() {
    this.game.removeGameObject(this);
  }

  protected addSerializableVec2Property(
    name: string,
    options?: {
      serializedName?: string;
      optional?: boolean;
      init?: () => vec2;
      copy?: (to: vec2, from: vec2) => vec2;
      serialize?: (value: vec2, changesOnly: boolean) => SerializedVec2;
      deserialize?: (sValue: SerializedVec2, initialize?: boolean) => void;
      equals?: (a: vec2, b: vec2) => boolean;
    }
  ) {
    this.addSerializableProperty(name, {
      optional: options?.optional,
      init: options?.init || vec2.create,
      copy: options?.copy || vec2.copy,
      serialize: options?.serialize || serializeVec2,
      deserialize:
        options?.deserialize ||
        ((source: SerializedVec2) => deserializeVec2((this as any)[name], source)),
      equals: options?.equals || vec2.equals
    });
  }

  protected addSerializableProperty(
    name: string,
    options?: {
      serializedName?: string;
      optional?: boolean;
      init?: () => any;
      copy?: (to: any, from: any) => any;
      serialize?: (value: any, changesOnly: boolean) => any;
      deserialize?: (sValue: any, initialize?: boolean) => void;
      equals?: (a: any, b: any) => boolean;
    }
  ) {
    addSerializableProperty(this.serializable, name, options);
  }

  serialize(changesOnly = false): SerializedGameBaseObject | null {
    if (this.removed) return null;

    return {
      type: "GameBaseObject", // Should get overwritten
      id: this.id,

      ...serializeSerializables(this.serializable, this._previousState, this, changesOnly)
    };
  }

  deserialize(obj: NetworkObject, initialize = true) {
    if (this.id != obj.id) throw "Id mismatch during deserialization!";
    // Because this class is inherited, 'type' may be different.
    // if (obj.type != "WorldBounds") throw "Type mismatch during deserialization!";

    deserializeSerializables(this.serializable, obj, this, initialize);

    // Reset lerp progress
    this.serverLerpProgress = 0;
  }
}
