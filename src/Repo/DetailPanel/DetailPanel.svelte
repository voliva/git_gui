<script lang="ts">
  import FullTabs from "@/components/FullTabs.svelte";
  import CommitDetails from "./CommitDetails.svelte";
  import { detailPanelContainer } from "./detailPanel.css";
  import WorkingDirectory from "./WorkingDirectory.svelte";
</script>

<FullTabs
  class={detailPanelContainer}
  options={[
    {
      id: "details",
      header: "Details",
    },
    {
      id: "workingDir",
      header: "Working Directory",
    },
  ]}
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
