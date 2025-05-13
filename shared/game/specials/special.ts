import { Camera, RefreshTime } from "star-engine";
import Ship from "../ship";

export type SpecialType = "none" | "warp" | "shield" | "grav" | "antigrav" | "missile" | "cloak";

export interface SerializableSpecial {
  type: SpecialType;
  power: number;
}

export default class Special {
  type: SpecialType = "none";
  owner: Ship;
  power: number = 50;

  constructor(owner: Ship, power: number) {
    this.owner = owner;
    this.power = power;
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

  serialize(): SerializableSpecial {
    return {
      type: this.type,
      power: this.power
    };
  }

  deserialize(obj: SerializableSpecial) {
    this.type = obj.type;
    this.power = obj.power;
  }
}
