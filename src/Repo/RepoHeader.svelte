<script>
  import { isFetching$, fetch } from "./repoState";
</script>

<div>
  <button disabled={$isFetching$} on:click={fetch}>Fetch</button>
</div>
