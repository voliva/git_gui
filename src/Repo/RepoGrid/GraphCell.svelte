<script lang="ts">
  import type { PositionedCommit } from "../repoState";
  import { drawCommit, drawGradient, drawPath } from "./graphColumn";
  import { ITEM_HEIGHT } from "./gridConstants";

  export let width: number;
  export let item: PositionedCommit;
  let canvas: HTMLCanvasElement;

  $: {
    const position = item.position;
    const ctx = canvas?.getContext("2d");

    if (ctx) {
      ctx.clearRect(0, 0, width, canvas.height);
      item.paths.forEach((path) => drawPath(ctx, width, position, path));
      drawGradient(
        ctx,
        width,
        false, // activeId() === item.commit.id,
        false // props.isHovering
      );

      // TODO I think it's safe to ignore? I would be passing props.item, but I have to know if it changes after a promise resolves.
      drawCommit(ctx, width, () => item);
    }
  }
</script>

<canvas height={ITEM_HEIGHT} {width} bind:this={canvas} />

<style>
  canvas {
    flex: "1 0 auto";
  }
</style>
