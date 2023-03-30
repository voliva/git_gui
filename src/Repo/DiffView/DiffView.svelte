<script lang="ts">
  import DiffHunk from "./DiffHunk.svelte";
  import { diffDelta$ } from "./diffViewState";
</script>

{#if $diffDelta$}
  <div class="diff-view">
    <div class="hunks">
      {#each $diffDelta$.hunks as hunk}
        <DiffHunk
          {hunk}
          newFile={$diffDelta$.new_file}
          oldFile={$diffDelta$.old_file}
        />
      {/each}
    </div>
  </div>
{:else}
  <div class="diff-view">Loading...</div>
{/if}

<style>
  .diff-view {
    flex: 1 1 auto;
    overflow: auto;
  }

  .hunks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
