<script lang="ts">
  import { qs } from "@/quickStyles";
  import { message } from "@tauri-apps/api/dialog";
  import classNames from "classnames";
  import { firstValueFrom, map } from "rxjs";
  import { workingDirectory$ } from "../DetailPanel/workingDirectoryState";
  import type { PositionedCommit } from "../repoState";
  import { checkoutCommit, isRelatedToActive$ } from "./activeCommit";
  import CommitRefs from "./CommitRefs.svelte";

  export let item: PositionedCommit;

  $: isUnrelated = isRelatedToActive$(item.id).pipe(map((v) => !v));

  const onDoubleClick = async (evt: MouseEvent) => {
    evt.stopPropagation();

    const workingDir = await firstValueFrom(workingDirectory$);
    if (workingDir.staged_deltas.length || workingDir.unstaged_deltas.length) {
      await message(
        "You have uncommited changes. Commit, stash or discard them."
      );
      return;
    }

    await checkoutCommit(item.id);
  };
</script>

<div
  class={classNames("summary-cell", {
    unrelated: $isUnrelated,
  })}
>
  <CommitRefs id={item.id} />
  <div class={qs("boxFill", "textEllipsis")} on:dblclick={onDoubleClick}>
    {item.commit.summary}
  </div>
</div>

<style>
  .summary-cell {
    flex: 1 1 auto;
    width: 100%;
    padding: 0 0.2rem;
    display: flex;
    align-items: center;
    gap: 0.2rem;
    max-height: 100%;
  }

  .unrelated {
    opacity: 0.6;
  }
</style>
