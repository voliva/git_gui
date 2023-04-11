<script lang="ts">
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { deltaPaths$ } from "./diffViewState";
  import { imgBackground } from "./imageDiff.css";
</script>

<div class="image-side-by-side">
  <ZoomContainer let:transform containerClass={imgBackground}>
    <div class="zoomable" style={transform}>
      <div>
        <div class="header">Original</div>
        <img alt="old" src={$deltaPaths$?.old} />
      </div>
      <div>
        <div class="header">Modified</div>
        <img alt="new" src={$deltaPaths$?.new} />
      </div>
    </div>
  </ZoomContainer>
</div>

<style>
  .image-side-by-side {
    flex: 1 1 auto;
  }
  .zoomable {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
  }
  .header {
    padding: 0 0.5rem;
    background: rgba(0, 0, 0, 0.8);
  }
  img {
    max-width: 100%;
    max-height: 100%;
  }
</style>
