<script lang="ts">
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { deltaPaths$ } from "./diffViewState";
  import { imgBackground } from "./imageDiff.css";
  import { createZoomStore } from "@/components/ZoomContainerStore";
  import ProgressiveImage from "./ProgressiveImage.svelte";

  let store = createZoomStore();
</script>

<div class="image-linked-diff">
  <div class="side">
    <div class="header">Original</div>
    <ZoomContainer
      let:transform
      let:scale
      containerClass={imgBackground}
      {store}
    >
      <div class="zoomable" style={transform}>
        <ProgressiveImage alt="old" src={$deltaPaths$?.old} {scale} />
      </div>
    </ZoomContainer>
  </div>
  <div class="side">
    <div class="header">Modified</div>
    <ZoomContainer
      let:transform
      let:scale
      containerClass={imgBackground}
      {store}
    >
      <div class="zoomable" style={transform}>
        <ProgressiveImage alt="new" src={$deltaPaths$?.new} {scale} />
      </div>
    </ZoomContainer>
  </div>
</div>

<style>
  .image-linked-diff {
    display: flex;
    flex: 1 1 auto;
    gap: 5px;
  }
  .side {
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
</style>
