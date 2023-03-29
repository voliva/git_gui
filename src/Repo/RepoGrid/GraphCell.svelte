<script lang="ts">
  import type { PositionedCommit } from "../repoState";
  import { drawCommit, drawGradient, drawPath } from "./graphColumn";
  import { ITEM_HEIGHT } from "./gridConstants";
  import { afterUpdate } from "svelte";

  export let width: number;
  export let item: PositionedCommit;
  export let isHovering: boolean;
  export let isActive: boolean;
  let canvas: HTMLCanvasElement;

  afterUpdate(() => {
    const position = item.position;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, width, canvas.height);
    item.paths.forEach((path) => drawPath(ctx, width, position, path));
    drawGradient(ctx, width, isActive, isHovering);

    drawCommit(ctx, width, () => item);
  });
</script>

<canvas height={ITEM_HEIGHT} {width} bind:this={canvas} />

<style>
  canvas {
    flex: "0 0 auto";
  }
</style>
