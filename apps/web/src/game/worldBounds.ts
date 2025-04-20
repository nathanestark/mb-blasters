import { RefreshTime } from "star-engine";
import WorldBoundsBase, {
  WorldBoundsProperties,
  SerializedWorldBounds
} from "@shared/game/worldBounds";
import DefaultCamera from "./defaultCamera";

export { SerializedWorldBounds, WorldBoundsProperties };

export default class WorldBounds extends WorldBoundsBase {
  draw(camera: DefaultCamera, _time: RefreshTime) {
    camera.context.strokeStyle = this.color;
    camera.context.lineWidth = 1 / camera.zoom[0];
    camera.context.strokeRect(this.position[0], this.position[1], this.size[0], this.size[1]);
  }

  static from(sObj: SerializedWorldBounds): WorldBounds {
    const obj = new WorldBounds();
    obj._id = sObj.id;
    obj.deserialize(sObj);
    return obj;
  }
}
