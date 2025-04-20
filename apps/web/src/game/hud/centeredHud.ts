import { Container, RefreshTime } from "star-engine";
import DefaultCamera from "../defaultCamera";

export default class CenteredHud extends Container {
  draw(camera: DefaultCamera, _time: RefreshTime) {
    // Centered HUD items should be drawn relative
    // to the canvas, but in the center.
    camera.context.translate(camera.size.width / 2, camera.size.height / 2);
  }
}
