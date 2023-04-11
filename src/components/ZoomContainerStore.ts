import { writable } from "svelte/store";

export interface ZoomState {
  scale: number;
  translate: { x: number; y: number };
}
export function createZoomStore() {
  return writable<ZoomState>({
    scale: 1,
    translate: { x: 0, y: 0 },
  });
}
