<script lang="ts">
  import { qs } from "@/quickStyles";
  import { state } from "@react-rxjs/core";
  import { invoke } from "@tauri-apps/api";
  import { message } from "@tauri-apps/api/dialog";
  import { firstValueFrom, map } from "rxjs";
  import AiOutlineCloud from "svelte-icons-pack/ai/AiOutlineCloud";
  import AiOutlineTag from "svelte-icons-pack/ai/AiOutlineTag";
  import FaSolidHorseHead from "svelte-icons-pack/fa/FaSolidHorseHead";
  import FiHardDrive from "svelte-icons-pack/fi/FiHardDrive";
  import Icon from "svelte-icons-pack/Icon.svelte";
  import { tippy } from "svelte-tippy";
  import { workingDirectory$ } from "../DetailPanel/workingDirectoryState";
  import {
    RefType,
    repoPath$,
    type LocalRef,
    type RemoteRef,
  } from "../repoState";
  import { checkoutCommit } from "./activeCommit";
  import { commitRefs, commitTagGroup } from "./commitRefs.css";
  import { refsLookup$, type LookedUpRef, type RefGroup } from "./refsLookup";

  export let id: string;

  const icons: Record<RefType, unknown> = {
    [RefType.Head]: FaSolidHorseHead,
    [RefType.LocalBranch]: FiHardDrive,
    [RefType.RemoteBranch]: AiOutlineCloud,
    [RefType.Tag]: AiOutlineTag,
  };

  $: refGroups$ = state(refsLookup$.pipe(map((refs) => refs[id] || {})), {});
  $: refGroups = Object.values($refGroups$);

  function getRefEntries(refs: Partial<Record<RefType, LookedUpRef[]>>) {
    return Object.entries(refs) as Array<[RefType, LookedUpRef[]]>;
  }
  function mapRemoteRefs(refs: LookedUpRef[]) {
    return refs.map((ref) => ref.ref as RemoteRef);
  }
  async function onGroupDblClick(evt: MouseEvent, group: RefGroup) {
    evt.stopPropagation();

    const isHead = Boolean(group.refs[RefType.Head]);
    if (isHead) return;

    const workingDir = await firstValueFrom(workingDirectory$);
    if (workingDir.staged_deltas.length || workingDir.unstaged_deltas.length) {
      await message(
        "You have uncommited changes. Commit, stash or discard them."
      );
      return;
    }

    const path = await firstValueFrom(repoPath$);

    const localBranch = group.refs[RefType.LocalBranch]?.[0];
    if (localBranch) {
      const ref = localBranch.ref as LocalRef;
      await invoke("checkout_local", {
        path,
        branchName: ref.name,
      });
      return;
    }

    const remoteBranches = group.refs[RefType.RemoteBranch] ?? [];
    if (remoteBranches.length) {
      const ref = remoteBranches[0].ref as RemoteRef;
      console.log("checkout remote branch", ref);
      await invoke("checkout_remote", {
        path,
        origin: ref.remote,
        branchName: ref.name,
      });
      return;
    }

    // It has to be a tag. Checkout commit.
    const tagGroup = group.refs[RefType.Tag];
    if (tagGroup) {
      await checkoutCommit(tagGroup[0].ref.id);
    }
  }
</script>

<div class={commitRefs}>
  {#each refGroups as group}
    <div
      class={commitTagGroup}
      on:dblclick={(evt) => onGroupDblClick(evt, group)}
    >
      {#each getRefEntries(group.refs) as [type, refs]}
        {#if type === RefType.RemoteBranch}
          <div
            class="tag-icon"
            use:tippy={{
              content: mapRemoteRefs(refs)
                .map((ref) => ref.remote)
                .join(", "),
            }}
          >
            <Icon src={AiOutlineCloud} />
          </div>
        {:else}
          <div class="tag-icon">
            <Icon src={icons[type]} />
          </div>
        {/if}
      {/each}
      <div class={qs("boxFill", "textEllipsis")}>{group.name}</div>
    </div>
  {/each}
</div>

<style>
  .tag-icon {
    flex: 0 0 auto;
  }
</style>
