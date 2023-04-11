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

      const topLeftPosition = new DOMPoint(
        -container.offsetWidth / 2,
        -container.offsetHeight / 2
      ).matrixTransform(newMatrix);
      const bottomRightPosition = new DOMPoint(
        container.offsetWidth / 2,
        container.offsetHeight / 2
      ).matrixTransform(newMatrix);

      const overflowAdjustment = { x: 0, y: 0 };
      // TODO this is buggy
      if (
        topLeftPosition.x + originDisplacement[0] >
        -container.offsetWidth / 2
      ) {
        overflowAdjustment.x =
          -container.offsetWidth / 2 -
          (topLeftPosition.x + originDisplacement[0]);
      } else if (
        bottomRightPosition.x + originDisplacement[0] <
        container.offsetWidth / 2
      ) {
        overflowAdjustment.x =
          container.offsetWidth / 2 -
          (bottomRightPosition.x + originDisplacement[0]);
      }
      if (
        topLeftPosition.y + originDisplacement[1] >
        -container.offsetHeight / 2
      ) {
        overflowAdjustment.y =
          -container.offsetHeight / 2 -
          (topLeftPosition.y + originDisplacement[1]);
      } else if (
        bottomRightPosition.y + originDisplacement[1] <
        container.offsetHeight / 2
      ) {
        overflowAdjustment.y =
          container.offsetHeight / 2 -
          (bottomRightPosition.y + originDisplacement[1]);
      }

      // Adjust position after scale
      translate = {
        x: translate.x + scale * (originDisplacement[0] + overflowAdjustment.x),
        y: translate.y + scale * (originDisplacement[1] + overflowAdjustment.y),
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

    const scaledWidth = {
      x: container.offsetWidth * scale,
      y: container.offsetHeight * scale,
    };
    const maxTransform = {
      x: (scaledWidth.x - container.offsetWidth) / 2,
      y: (scaledWidth.y - container.offsetHeight) / 2,
    };

    function handleMouseMove(evt: MouseEvent) {
      store.update((prev) => ({
        ...prev,
        translate: {
          x: Math.max(
            -maxTransform.x,
            Math.min(maxTransform.x, start.x + evt.pageX)
          ),
          y: Math.max(
            -maxTransform.y,
            Math.min(maxTransform.y, start.y + evt.pageY)
          ),
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
