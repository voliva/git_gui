<script lang="ts">
  import { qs } from "@/quickStyles";
  import RepoGrid from "./RepoGrid/RepoGrid.svelte";
  import RepoHeader from "./RepoHeader.svelte";
</script>

<div class={qs("verticalFlex", "noOverflow")}>
  <RepoHeader />

  <div class={qs("boxFill", "horizontalFlex", "noOverflow")}>
    <RepoGrid />
    <!-- <DetailPanel /> -->
  </div>
</div>
