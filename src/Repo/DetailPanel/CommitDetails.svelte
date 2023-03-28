<script lang="ts">
  import { isNotNullish } from "@/lib/rxState";
  import { qs } from "@/quickStyles";
  import classNames from "classnames";
  import { combineLatest, distinctUntilChanged, filter, map } from "rxjs";
  import { activeCommit$ } from "../RepoGrid/activeCommit";
  import { commitLookup$ } from "../repoState";
  import CommitHeader from "./CommitHeader.svelte";

  const commit$ = combineLatest([
    activeCommit$.pipe(filter(isNotNullish)),
    commitLookup$,
  ]).pipe(
    filter(([id, commits]) => id in commits),
    map(([id, commits]) => commits[id].commit),
    distinctUntilChanged()
  );
</script>

<div class={classNames(qs("boxAuto"), "commit-details")}>
  {#if $commit$}
    <CommitHeader commit={$commit$} />
    <!-- <CommitDetails commit={commit()!} />
      <ActiveCommitChanges /> -->
  {/if}
</div>

<style>
  .commit-details {
    padding: 0.5rem;
  }
</style>
