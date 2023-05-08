<script lang="ts">
  import ZoomContainer from "@/components/ZoomContainer.svelte";
  import { deltaPaths$ } from "./diffViewState";
  import { imgBackground } from "./imageDiff.css";
  import { createZoomStore } from "@/components/ZoomContainerStore";

  let store = createZoomStore();
</script>

<div class="image-linked-diff">
  <div class="side">
    <div class="header">Original</div>
    <ZoomContainer let:transform containerClass={imgBackground} {store}>
      <div class="zoomable" style={transform}>
        <img alt="old" src={$deltaPaths$?.old} />
      </div>
    </ZoomContainer>
  </div>
  <div class="side">
    <div class="header">Modified</div>
    <ZoomContainer let:transform containerClass={imgBackground} {store}>
      <div class="zoomable" style={transform}>
        <img alt="new" src={$deltaPaths$?.new} />
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
  img {
    max-width: 100%;
    max-height: 100%;
  }
</style>
