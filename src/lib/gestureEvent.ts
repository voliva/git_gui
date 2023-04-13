/* eslint-disable @typescript-eslint/no-explicit-any */

export function supportsGestures() {
  return "GestureEvent" in globalThis;
}

export type GestureEvent = UIEvent & {
  scale: number;
  rotation: number;
  layerX: number;
  layerY: number;
};

export function createGestureListener(
  target: HTMLElement,
  handler: (evt: GestureEvent) => {
    change?: (evt: GestureEvent) => void;
    end?: (evt: GestureEvent) => void;
  }
) {
  if (!supportsGestures()) return () => {};

  function handleGesture(evt: GestureEvent) {
    const { change = () => {}, end } = handler(evt);

    function handleGestureEnd(evt: GestureEvent) {
      end?.(evt);
      target.removeEventListener("gesturechange", change as any);
      target.removeEventListener("gestureend", handleGestureEnd as any);
    }
    target.addEventListener("gesturechange", change as any);
    target.addEventListener("gestureend", handleGestureEnd as any);
  }
  target.addEventListener("gesturestart", handleGesture as any);
  return () => target.removeEventListener("gesturestart", handleGesture as any);
}
