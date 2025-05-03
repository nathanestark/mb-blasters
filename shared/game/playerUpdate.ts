import { NetworkObject } from "./network";

export default interface PlayerUpdate extends NetworkObject {
  name: string;
}
