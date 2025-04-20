import { FollowCamera, FollowCameraProperties } from "star-engine";

export default class DefaultCamera extends FollowCamera {
  constructor(canvas: HTMLCanvasElement, properties: FollowCameraProperties) {
    super(canvas, properties);
  }
}
