<script lang="ts">
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { deltaPaths$ } from "./diffViewState";
  import { slideImage } from "./imageDiff.css";

  let opacity = 1;
</script>

<div class="image-overlay-diff">
  <div class="header">
    Original
    <input type="range" min="0" max="1" step="0.01" bind:value={opacity} />
    Modified
  </div>
  <ZoomContainer let:transform>
    <div class={slideImage} style={transform}>
      <img alt="old" src={$deltaPaths$?.old} />
    </div>
    <div class={slideImage} style={`${transform}; opacity: ${opacity};`}>
      <img alt="new" src={$deltaPaths$?.new} />
    </div>
  </ZoomContainer>
</div>

<style>
  .image-overlay-diff {
    flex: 1 1 auto;
    user-select: none;
    display: flex;
    flex-direction: column;
    padding: 0 1rem;
  }
  .header {
    text-align: center;
  }
  .header input {
    vertical-align: middle;
  }
</style>
