<script lang="ts">
  import { type DeltaDiff, diffViewSettings$ } from "./diffViewState";

  export let highlightedDelta: DeltaDiff;
  $: hunk_or_file = $diffViewSettings$?.hunk_or_file;
</script>
