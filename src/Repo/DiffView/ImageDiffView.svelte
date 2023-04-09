<script lang="ts">
  import { deltaPaths$ } from "./diffViewState";
</script>

<div class="image-diff-view">
  <img alt="old" src={$deltaPaths$?.old} />
  <img alt="new" src={$deltaPaths$?.new} />
</div>

<style>
  .image-diff-view {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
  }
</style>
