<script lang="ts">
  import { qs } from "@/quickStyles";
  import type { CommitInfo } from "../repoState";
  import { historyCommit } from "./history.css";
  import classNames from "classnames";
  import { selectCommit, selectedCommit$ } from "./historyState";

  const GRAVATAR_SIZE = 36;
  export let commit: CommitInfo;

  const getGravatarUrl = () => {
    const hash = commit.author.hash ?? "no_one";
    return `https://www.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=identicon`;
  };

  $: summary =
    commit.summary?.length! > 80
      ? commit.summary!.slice(0, 80) + "…"
      : commit.summary;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class={classNames(historyCommit, {
    active: $selectedCommit$ === commit.id,
  })}
  on:click={() => selectCommit(commit.id)}
>
  <img
    src={getGravatarUrl()}
    width={GRAVATAR_SIZE}
    height={GRAVATAR_SIZE}
    alt="avatar"
  />
  <div class={qs("verticalFlex", "noOverflow")}>
    <div class="summary">{summary}</div>
    <div class={classNames(qs("textEllipsis"), "author")}>
      {commit.author.name ?? commit.author.email ?? ""}
    </div>
  </div>
</div>

<style>
  .active {
    border: thin solid white;
  }
  .summary {
    padding-left: 1rem;
    text-indent: -1rem;
  }
  .author {
    font-size: 0.9rem;
    color: #aaa;
  }
</style>
