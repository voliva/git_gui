<script lang="ts">
  import FullTabs from "@/components/FullTabs.svelte";
  import CommitDetails from "./CommitDetails.svelte";
  import { detailPanelContainer } from "./detailPanel.css";
  import WorkingDirectory from "./WorkingDirectory.svelte";
  import { workingDirectory$ } from "./workingDirectoryState";
  import { map } from "rxjs";
  import { withDefault } from "@react-rxjs/core";
  import { setDiffDelta } from "../DiffView/diffViewState";
  import { componentEffect } from "@/lib/rxState";
  import { commitChange$ } from "../RepoGrid/activeCommit";

  let fullTabs: FullTabs;
  componentEffect(
    commitChange$.subscribe(() => fullTabs.selectOption("details"))
  );

  const hasChanges$ = workingDirectory$.pipeState(
    map(
      ({ staged_deltas, unstaged_deltas }) =>
        staged_deltas.length + unstaged_deltas.length > 0
    ),
    withDefault(false)
  );
</script>

<FullTabs
  class={detailPanelContainer}
  padHeader
  options={[
    {
      id: "details",
      header: "Commit Details",
    },
    {
      id: "workingDir",
      header: `Working Directory`,
      highlight: $hasChanges$,
    },
  ]}
  on:tabchange={(evt) => {
    if (evt.detail.id === "details") {
      setDiffDelta(null);
    }
  }}
  bind:this={fullTabs}
  let:id
>
  {#if id === "details"}
    <CommitDetails />
  {:else if id == "workingDir"}
    <WorkingDirectory />
  {/if}
</FullTabs>

<style>
</style>
