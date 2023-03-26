<script lang="ts">
  import type { PositionedCommit } from "../repoState";

  export let item: PositionedCommit;
</script>

<div>{item.commit.summary}</div>

<style>
</style>
