<script lang="ts">
  import { qs } from "@/quickStyles";
  import HistoryList from "./HistoryList.svelte";
</script>

<div class={qs("boxFill", "horizontalFlex", "noOverflow")}>
  <div class={qs("boxFill")} />
  <HistoryList />
</div>
