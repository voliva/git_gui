<script lang="ts">
  import classNames from "classnames";
  import { detailPanelContainer } from "../DetailPanel/detailPanel.css";
  import HistoryCommit from "./HistoryCommit.svelte";
  import { viewHistory$ } from "./historyState";

  $: list = $viewHistory$?.result ?? [];
</script>

<div class={classNames(detailPanelContainer, "list")}>
  {#each list as commit}
    <HistoryCommit {commit} />
  {/each}
</div>

<style>
  .list {
    padding: 0.5rem;
    gap: 0.5rem;
    width: 30rem;
  }
</style>
