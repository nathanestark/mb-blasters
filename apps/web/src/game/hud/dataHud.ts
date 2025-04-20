import { Container, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";

export default class DataHud extends Container {
  draw(camera: DefaultCamera, _time: RefreshTime) {
    // HUDs should be drawn relative to the canvas.
    camera.context.setTransform(1, 0, 0, 1, 0, 0);
  }
}
