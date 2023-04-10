<script lang="ts">
  import { deltaPaths$ } from "./diffViewState";
</script>

<div class="image-side-by-side">
  <div>
    <div class="header">Original</div>
    <img alt="old" src={$deltaPaths$?.old} />
  </div>
  <div>
    <div class="header">Modified</div>
    <img alt="new" src={$deltaPaths$?.new} />
  </div>
</div>

<style>
  .image-side-by-side {
    flex: 1 1 auto;

    display: flex;
    gap: 1rem;
    padding: 1rem;
    align-items: center;
    justify-content: center;

    /* TODO generic */
    background-image: linear-gradient(
      45deg,
      #aaa 12.5%,
      #666 12.5%,
      #666 50%,
      #aaa 50%,
      #aaa 62.5%,
      #666 62.5%,
      #666 100%
    );
    background-size: 12px 12px;
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
