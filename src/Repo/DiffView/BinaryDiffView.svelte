<script lang="ts">
  import { deltaPaths$ } from "./diffViewState";
</script>

<div class="binary-diff-view">
  <img src={$deltaPaths$?.new} />
</div>

<style>
  .binary-diff-view {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }
</style>
