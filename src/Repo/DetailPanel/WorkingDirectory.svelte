<script lang="ts">
  import { stage, unstage, workingDirectory$ } from "./workingDirectoryState";
  import WdStagingList from "./WDStagingList.svelte";
  import WdCreateCommit from "./WDCreateCommit.svelte";
</script>

<div class="working-directory">
  <WdStagingList
    title="Unstaged changes"
    deltas={$workingDirectory$?.unstaged_deltas ?? []}
    on:selectAll={() => stage()}
    on:select={(evt) => stage(evt.detail)}
  />
  <WdStagingList
    title="Staged changes"
    deltas={$workingDirectory$?.staged_deltas ?? []}
    checked
    on:selectAll={() => unstage()}
    on:select={(evt) => unstage(evt.detail)}
  />
  <WdCreateCommit />
</div>

<style>
  .working-directory {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    overflow-y: auto;
  }
</style>
