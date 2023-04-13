<script lang="ts">
  import classNames from "classnames";
  import type { Updater, Writable } from "svelte/store";
  import { createZoomStore, type ZoomState } from "./ZoomContainerStore";
  import { onDestroy, onMount } from "svelte";
  import { createGestureListener, supportsGestures } from "@/lib/gestureEvent";

  const MAX_SCALE = 100;
  let container: HTMLDivElement;

  export let containerClass = "";
  export let wheelMode: "pan" | "zoom" = supportsGestures() ? "pan" : "zoom";

  export let store: Writable<ZoomState> = createZoomStore();
  let isDragging = false;

  $: translate = $store.translate;
  $: scale = $store.scale;
  $: matrix = new DOMMatrix().translate(translate.x, translate.y).scale(scale);

  function getBoundsFn(scale: number) {
    const scaledWidth = {
      x: container.offsetWidth * scale,
      y: container.offsetHeight * scale,
    };
    const maxTransform = {
      x: (scaledWidth.x - container.offsetWidth) / 2,
      y: (scaledWidth.y - container.offsetHeight) / 2,
    };
    return {
      x: (v: number) => Math.max(-maxTransform.x, Math.min(maxTransform.x, v)),
      y: (v: number) => Math.max(-maxTransform.y, Math.min(maxTransform.y, v)),
    };
  }

  function onZoomInput(
    evt: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    }
  ) {
    store.update((prev) => {
      const scale = Math.exp(evt.currentTarget.valueAsNumber);
      const bounds = getBoundsFn(scale);

      const origin = new DOMPoint(0, 0).matrixTransform(matrix.inverse());
      const newMatrix = new DOMMatrix()
        .translate(prev.translate.x, prev.translate.y)
        .scale(scale);
      const newOrigin = new DOMPoint(0, 0).matrixTransform(newMatrix.inverse());

      const originDisplacement = [
        newOrigin.x - origin.x,
        newOrigin.y - origin.y,
      ];

      return {
        scale,
        translate: {
          x: bounds.x(prev.translate.x + scale * originDisplacement[0]),
          y: bounds.y(prev.translate.y + scale * originDisplacement[1]),
        },
      };
    });
  }

  function updateZoomWheel(evt: WheelEvent): Updater<ZoomState> {
    return ({ translate, scale }) => {
      let x = evt.clientX - container.offsetLeft - container.offsetWidth / 2;
      let y = evt.clientY - container.offsetTop - container.offsetHeight / 2;
      const point = new DOMPoint(x, y);
      const revPoint = point.matrixTransform(matrix.inverse());

      // 0 => 1, 120 => 1.1
      // TODO deltaMode (I think I'm assuming DOM_DELTA_PIXEL here)
      const factor = Math.min(1.2, 1 + (0.1 * Math.abs(evt.deltaY)) / 120);
      if (evt.deltaY > 0) {
        scale = Math.max(1, scale / factor);
      } else {
        scale = Math.min(MAX_SCALE, scale * factor);
      }

      const newMatrix = new DOMMatrix()
        .translate(translate.x, translate.y)
        .scale(scale);
      const newRevPoint = point.matrixTransform(newMatrix.inverse());

      const originDisplacement = [
        newRevPoint.x - revPoint.x,
        newRevPoint.y - revPoint.y,
      ];

      const bounds = getBoundsFn(scale);

      // Adjust position after scale
      translate = {
        x: bounds.x(translate.x + scale * originDisplacement[0]),
        y: bounds.y(translate.y + scale * originDisplacement[1]),
      };

      return { translate, scale };
    };
  }
  function updatePanWheel(evt: WheelEvent): Updater<ZoomState> {
    return (prev) => {
      const bounds = getBoundsFn(prev.scale);

      // TODO I'm doing - because it's what feels natural for me: as if I'm dragging the image with the touchpad
      // but maybe also open it up for config.
      return {
        ...prev,
        translate: {
          x: bounds.x(prev.translate.x - evt.deltaX),
          y: bounds.y(prev.translate.y - evt.deltaY),
        },
      };
    };
  }

  function handleWheel(evt: WheelEvent) {
    if (isDragging) return;

    evt.preventDefault();

    store.update(
      wheelMode === "zoom" ? updateZoomWheel(evt) : updatePanWheel(evt)
    );
  }
  function handleMouseDown(evt: MouseEvent) {
    evt.preventDefault();

    isDragging = true;
    const start = {
      x: translate.x - evt.pageX,
      y: translate.y - evt.pageY,
    };

    const bounds = getBoundsFn(scale);

    function handleMouseMove(evt: MouseEvent) {
      store.update((prev) => ({
        ...prev,
        translate: {
          x: bounds.x(start.x + evt.pageX),
          y: bounds.y(start.y + evt.pageY),
        },
      }));
    }
    function handleMouseUp() {
      isDragging = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  let destroyGestureListener = () => {};
  onMount(() => {
    destroyGestureListener = createGestureListener(container, (evt) => {
      isDragging = true;
      const startingState = { translate, scale };

      const point = new DOMPoint(
        evt.layerX - container.offsetWidth / 2,
        evt.layerY - container.offsetHeight / 2
      );
      const origin = point.matrixTransform(matrix.inverse());

      return {
        change(evt) {
          store.update(() => {
            const scale = Math.max(
              1,
              Math.min(100, startingState.scale * evt.scale)
            );

            // operation of moving to center, scaling and moving back to the original position
            const originDisplacement = [
              startingState.scale * origin.x - scale * origin.x,
              startingState.scale * origin.y - scale * origin.y,
            ];

            const bounds = getBoundsFn(scale);
            return {
              scale,
              translate: {
                x: bounds.x(startingState.translate.x + originDisplacement[0]),
                y: bounds.y(startingState.translate.y + originDisplacement[1]),
              },
            };
          });
        },
        end() {
          isDragging = false;
        },
      };
    });
  });

  onDestroy(() => {
    destroyGestureListener();
  });
</script>

<div
  class={classNames("zoom-container", containerClass)}
  style={scale > 2 ? `image-rendering: pixelated;` : ""}
  bind:this={container}
  on:wheel={handleWheel}
  on:mousedown={handleMouseDown}
>
  <slot
    {scale}
    {translate}
    transform={`transform: ${matrix.toString()}`}
    {matrix}
  />
  {#if wheelMode === "pan"}
    <input
      type="range"
      value={Math.log(scale)}
      on:input={onZoomInput}
      on:mousedown={(evt) => evt.stopPropagation()}
      min={Math.log(1)}
      max={Math.log(MAX_SCALE)}
      step={Math.log(MAX_SCALE) / 100}
    />
  {/if}
</div>

<style>
  .zoom-container {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
  .zoom-container > *:not(input) {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  input {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
  }
</style>
