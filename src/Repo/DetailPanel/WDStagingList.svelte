<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Delta } from "./activeCommitChangesState";
  import FileDelta from "./FileDelta.svelte";
  import { selectedDelta$, setDiffDelta } from "../DiffView/diffViewState";

  export let title: string;
  export let deltas: Delta[];
  export let checked = false;
  const dispatch = createEventDispatcher();
</script>

<div class="staging-list-container">
  <div class="staging-list-header">
    <div>{title}</div>
    <input
      type="checkbox"
      {checked}
      disabled={deltas.length === 0}
      on:click={(evt) => {
        evt.preventDefault();
        dispatch("selectAll");
      }}
      title={checked ? "deselect all" : "select all"}
    />
  </div>
  <ul class="staging-list">
    {#each deltas as delta}
      <FileDelta
        {delta}
        on:click={() => {
          if (!delta.binary || delta.mime_type?.startsWith("image")) {
            setDiffDelta({ delta, kind: checked ? "staged" : "unstaged" });
          }
        }}
      >
        <input
          type="checkbox"
          {checked}
          on:click={(evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            dispatch("select", delta);
          }}
        />
      </FileDelta>
    {/each}
  </ul>
</div>

<style>
  .staging-list-container {
    background: var(--deep-bg-color);
    margin-bottom: 0.5rem;
    padding: 0.2rem;
    padding-bottom: 0.5rem;
    border-radius: 5;
  }

  .staging-list-header {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem;
    overflow-y: scroll;
    user-select: none;
  }

  .staging-list {
    overflow-x: clip;
    overflow-y: scroll;
    height: 10rem;
  }
</style>
