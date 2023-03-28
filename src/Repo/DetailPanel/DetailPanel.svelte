<script lang="ts">
  import FullTabs from "@/components/FullTabs.svelte";
  import CommitDetails from "./CommitDetails.svelte";
  import { detailPanelContainer } from "./detailPanel.css";
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
    <div>Working Dir</div>
  {/if}
</FullTabs>

<style>
</style>
