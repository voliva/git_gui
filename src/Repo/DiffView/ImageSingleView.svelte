<script lang="ts">
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { deltaPaths$ } from "./diffViewState";
  import { slideImage } from "./imageDiff.css";

  $: path = $deltaPaths$?.new ?? $deltaPaths$?.old;
  $: header = $deltaPaths$?.new ? "Added" : "Removed";
</script>

<div class="image-overlay-diff">
  <div class="header">
    {header}
  </div>
  <ZoomContainer let:transform>
    <div class={slideImage} style={transform}>
      <img alt="selected file" src={path} />
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
</style>
