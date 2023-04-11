<script lang="ts">
  import { deltaPaths$ } from "./diffViewState";
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { absoluteFull, slideImage, slideImageHeader } from "./imageDiff.css";

  let container: HTMLDivElement;

  let maskSize = 0.01;

  function handleMouseDown(evt: MouseEvent) {
    evt.preventDefault();

    function handleMouseMove(evt: MouseEvent) {
      const x = evt.clientX - container.offsetLeft;
      maskSize = Math.max(0, Math.min(1, x / container.offsetWidth));
    }
    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }
</script>

<div class="image-overlay-diff">
  <div class="image-area" bind:this={container}>
    <ZoomContainer containerClass={absoluteFull} let:transform>
      <div class={slideImage} style={transform}>
        <div class={slideImageHeader}>Modified</div>
        <img alt="new" src={$deltaPaths$?.new} />
      </div>
      <div
        class={absoluteFull}
        style={`clip-path: polygon(0% 0%, ${maskSize * 100}% 0%, ${
          maskSize * 100
        }% 100%, 0% 100%)`}
      >
        <div class={slideImage} style={transform}>
          <div class={slideImageHeader}>Original</div>
          <img alt="old" src={$deltaPaths$?.old} />
        </div>
      </div>
    </ZoomContainer>
    <div
      class="mask-resizer"
      style={`left: ${maskSize * 100}%`}
      on:mousedown={handleMouseDown}
    />
  </div>
</div>

<style>
  .image-overlay-diff {
    flex: 1 1 auto;
    user-select: none;
    display: flex;
    padding: 0 1rem;
  }
  .image-area {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
  .mask-resizer {
    position: absolute;
    top: 0;
    height: 100%;
    left: 66%;
    transform: translateX(-50%);
    width: 2px;
    background-color: #222244;
    border: 3px solid white;
    border-top: none;
    border-bottom: none;
    cursor: col-resize;
  }
</style>
