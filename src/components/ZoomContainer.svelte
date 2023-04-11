<script lang="ts">
  import classNames from "classnames";
  import type { Writable } from "svelte/store";
  import { createZoomStore, type ZoomState } from "./ZoomContainerStore";

  let container: HTMLDivElement;

  export let containerClass = "";

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

  function handleWheel(evt: WheelEvent) {
    if (isDragging) return;

    evt.preventDefault();

    store.update(({ translate, scale }) => {
      let x = evt.clientX - container.offsetLeft - container.offsetWidth / 2;
      let y = evt.clientY - container.offsetTop - container.offsetHeight / 2;
      const point = new DOMPoint(x, y);
      const revPoint = point.matrixTransform(matrix.inverse());

      if (evt.deltaY > 0) {
        scale = Math.max(1, scale / 1.1);
      } else {
        scale = Math.min(100, scale * 1.1);
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
    });
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
</div>

<style>
  .zoom-container {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
  .zoom-container > * {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
