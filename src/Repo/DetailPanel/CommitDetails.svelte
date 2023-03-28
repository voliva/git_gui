<script lang="ts">
  import { isNotNullish } from "@/lib/rxState";
  import { qs } from "@/quickStyles";
  import { combineLatest, distinctUntilChanged, filter, map } from "rxjs";
  import { activeCommit$ } from "../RepoGrid/activeCommit";
  import { commitLookup$ } from "../repoState";
  import CommitAuthor from "./CommitAuthor.svelte";
  import CommitChanges from "./CommitChanges.svelte";
  import CommitHeader from "./CommitHeader.svelte";
  import CommitLink from "./CommitLink.svelte";

  const commit$ = combineLatest([
    activeCommit$.pipe(filter(isNotNullish)),
    commitLookup$,
  ]).pipe(
    filter(([id, commits]) => id in commits),
    map(([id, commits]) => commits[id].commit),
    distinctUntilChanged()
  );
  const author$ = commit$.pipe(map((commit) => commit.author));
</script>

<div class={qs("boxFill", "verticalFlex", "noOverflow")}>
  {#if $commit$}
    <div class="commit-info">
      <CommitHeader commit={$commit$} />
      <CommitAuthor author={$author$} />
      {#if $commit$.parents.length}
        <div>
          Parents:
          {#each $commit$.parents as id}
            <CommitLink {id} />
            {" "}
          {/each}
        </div>
      {/if}
    </div>
    <CommitChanges />
  {/if}
</div>

<style>
  .commit-info {
    padding: 0.5rem;
  }
</style>
