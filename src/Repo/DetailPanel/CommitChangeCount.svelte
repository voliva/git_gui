<script lang="ts">
  import { qs } from "@/quickStyles";
  import type { CommitContents } from "./activeCommitChangesState";
  import * as classes from "./commitChanges.css";

  export let changes: CommitContents;

  const getWidth = (value: number) => {
    const maxAmount = Math.max(100, changes.deletions, changes.insertions);
    return Math.round((1000 * value) / maxAmount) / 10 + "%";
  };
</script>

<div class={qs("boxAuto", "horizontalFlex")}>
  <div class={qs("boxFill")}>Files: {changes.deltas.length}</div>
  <div class={qs("horizontalFlex", "centeredFlex")}>
    <span class={classes.deletions}>{changes.deletions}</span>
    <div class={classes.infographicBg}>
      <div
        class={classes.infographicFg.deletion}
        style="width: {getWidth(changes.deletions)}"
      />
    </div>
    <div class={classes.infographicBg}>
      <div
        class={classes.infographicFg.insertion}
        style="width: {getWidth(changes.insertions)}"
      />
    </div>
    <span class={classes.insertions}>{changes.insertions}</span>
  </div>
</div>

<style>
  .commit-changes {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    padding: 0 0.5rem;
    overflow: hidden;
  }
</style>
