import { Camera, RefreshTime } from "star-engine";
import Ship from "../ship";
import {
  addSerializableProperty,
  deserializeSerializables,
  SerializableProperty,
  serializeSerializables
} from "../network";

export type SpecialType = "none" | "warp" | "shield" | "grav" | "antigrav" | "missile" | "cloak";

export interface SerializedSpecial {
  type: SpecialType;
  power: number;
}

export default class Special {
  type: SpecialType = "none";
  owner: Ship;
  power: number = 50;

  serializable: Array<SerializableProperty> = [];

  constructor(owner: Ship, power: number) {
    this.owner = owner;
    this.power = power;

    this.addSerializableProperty("type");
    this.addSerializableProperty("power");
  }

  on() {}

  off() {}

  /* Drawn to the global context, using only camera transform,
     before ship is drawn.
   */
  beforeShipDrawGlobal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the local ship context, no transforms, before ship
     is drawn.
     Effectively the same as beforeShipDrawBeforeTransLocal
   */
  beforeShipDrawLocal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the local ship context, no transforms, before ship
     is drawn.
     Effectively the same as beforeShipDrawLocal
   */
  beforeShipDrawBeforeTransLocal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the local ship context, after ship transforms applied,
     before ship is drawn.     
   */
  beforeShipDrawAfterTransLocal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the local ship context, after ship is drawn, before
     ship transform is reset  
   */
  afterShipDrawAfterTransLocal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the local ship context, after ship is drawn, after
     ship transform is reset  
   */
  afterShipDrawLocal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;
  /* Drawn to the global context, after ship is drawn, using only
     camera transform
   */
  afterShipDrawGlobal?(
    camera: Camera,
    context: OffscreenCanvasRenderingContext2D,
    time: RefreshTime
  ): void;

  update(time: RefreshTime) {}

  equals(previousState: Record<string, any>) {
    return this.serializable.every((val) => {
      // I don't think optional matters here.
      // if (!val.optional) return false;
      if (!val.equals) return previousState[val.name] == (this as any)[val.name];
      return val.equals(previousState[val.name], (this as any)[val.name]);
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

  serialize(previousState: Record<string, any>, changesOnly = false): SerializedSpecial {
    return {
      ...serializeSerializables(this.serializable, previousState, this, changesOnly)
    } as SerializedSpecial;
  }

  deserialize(obj: SerializedSpecial, initialize = true) {
    deserializeSerializables(this.serializable, obj, this, initialize);
  }
}
