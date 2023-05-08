<script lang="ts">
  import { qs } from "@/quickStyles";
  import { setDiffDelta } from "../DiffView/diffViewState";
  import { commitChanges$ } from "./activeCommitChangesState";
  import CommitChangeCount from "./CommitChangeCount.svelte";
  import FileDelta from "./FileDelta.svelte";
</script>

{#if $commitChanges$}
  <div class="commit-changes">
    <CommitChangeCount changes={$commitChanges$} />
    <div class={qs("boxFill", "overflowVertical")}>
      <ul>
        {#each $commitChanges$.deltas as delta}
          <FileDelta
            {delta}
            on:click={() => {
              if (!delta.binary || delta.mime_type?.startsWith("image")) {
                setDiffDelta({ delta, kind: "commit" });
              }
            }}
          />
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .commit-changes {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 0 0.5rem;
    overflow: hidden;
  }
</style>
