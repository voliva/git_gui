<script lang="ts">
  import { qs } from "@/quickStyles";
  import type { Subscription } from "rxjs";
  import { onDestroy, onMount } from "svelte";
  import DetailPanel from "./DetailPanel/DetailPanel.svelte";
  import DiffView from "./DiffView/DiffView.svelte";
  import { selectedDelta$ } from "./DiffView/diffViewState";
  import RepoGrid from "./RepoGrid/RepoGrid.svelte";
  import RepoHeader from "./RepoHeader.svelte";
  import { commits$ } from "./repoState";
  import ImageDiffView from "./DiffView/ImageDiffView.svelte";

  let sub: Subscription;
  onMount(() => {
    sub = commits$.subscribe();
  });
  onDestroy(() => {
    sub.unsubscribe();
  });
</script>

<div class={qs("verticalFlex", "noOverflow")} style="height: 100%">
  <RepoHeader />

  <div class={qs("boxFill", "horizontalFlex", "noOverflow")}>
    {#if $selectedDelta$?.mime_type?.startsWith("image")}
      <ImageDiffView />
    {:else if $selectedDelta$}
      <DiffView />
    {:else}
      <RepoGrid />
    {/if}
    <DetailPanel />
  </div>
</div>
