<script lang="ts">
  import FullTabs from "@/components/FullTabs.svelte";
  import { qs } from "@/quickStyles";
  import { invoke } from "@tauri-apps/api";
  import { filter, firstValueFrom, map, of, switchMap } from "rxjs";
  import { setActiveCommit } from "../RepoGrid/activeCommit";
  import { commitLookup$, refs$, repoPath$ } from "../repoState";
  import { workingDirectory$ } from "./workingDirectoryState";

  const headMessage$ = refs$.pipe(
    switchMap(({ head }) =>
      head
        ? commitLookup$.pipe(
            map((lookup) => lookup[head]),
            filter((v) => !!v),
            map((positionedCommit) => positionedCommit.commit),
            map((commit) =>
              commit.body
                ? `${commit.summary}\n${commit.body}`
                : commit.summary ?? ""
            )
          )
        : of("")
    )
  );

  enum CommitTab {
    New = "new",
    Amend = "amend",
  }

  let commitMessage = "";
  let activeTab = CommitTab.New;
  const onTabChange = (id: string) => (activeTab = id as CommitTab);

  let hasStagedChanges$ = workingDirectory$.pipe(
    map(({ staged_deltas }) => staged_deltas.length > 0)
  );
  let hasStagedChanges = $hasStagedChanges$;

  let commitBtnDisabled = true;
  $: {
    const hasCommitMessage = commitMessage !== "";
    if (activeTab === CommitTab.New) {
      // TODO it's posible to make a commit without changes with merge commits
      commitBtnDisabled = !hasCommitMessage || !hasStagedChanges;
    } else {
      commitBtnDisabled = !hasCommitMessage;
    }
  }

  let messageLength = "";
  $: {
    const firstLineBreak = commitMessage.indexOf("\n");
    if (firstLineBreak < 0) {
      messageLength = `${commitMessage.length}`;
    } else {
      const summary = firstLineBreak;
      // -1 because we exclude the new line
      const body = commitMessage.length - firstLineBreak - 1;
      messageLength = `${summary} + ${body} = ${commitMessage.length - 1}`;
    }
  }

  let modified = false;
  $: isNewCommitDisabled = activeTab === CommitTab.Amend && modified;
  // TODO amendDisabled if no head commit (initial commit or orphan branch)
  $: isAmendDisabled = activeTab === CommitTab.New && modified;

  const setMessageToPreviousCommit = async () => {
    const message = await firstValueFrom(headMessage$);
    commitMessage = message;
    modified = false;
  };
  const resetMessageToDefault = () => {
    commitMessage = "";
    modified = false;
  };

  async function performCommit() {
    const path = await firstValueFrom(repoPath$);
    const id = await invoke<string>("commit", {
      path,
      message: commitMessage,
      amend: activeTab === CommitTab.Amend,
    });
    resetMessageToDefault();
    // TODO reset active tab to new commit
    await firstValueFrom(
      commitLookup$.pipe(filter((lookup) => Boolean(lookup[id])))
    );
    setActiveCommit(id);
  }
</script>

<div class={qs("verticalFlex")}>
  <FullTabs
    options={[
      {
        header: "New Commit",
        disabled: isNewCommitDisabled,
        onActive: resetMessageToDefault,
        id: CommitTab.New,
      },
      {
        header: "Amend previous",
        disabled: isAmendDisabled,
        onActive: setMessageToPreviousCommit,
        id: CommitTab.Amend,
      },
    ]}
    on:tabChange={(evt) => onTabChange(evt.detail.id)}
  />
  <textarea
    class="commit-message-area"
    placeholder="Commit message"
    bind:value={commitMessage}
    on:input={(evt) => {
      modified = evt.currentTarget.value !== "";
    }}
  />
  <div class="message-length">{messageLength}</div>
  <button
    class="commit-btn"
    disabled={commitBtnDisabled}
    on:click={performCommit}
  >
    Commit
  </button>
</div>

<style>
  .commit-message-area {
    background-color: var(--deep-bg-color);
    line-height: 1.5;
    color: white;
    padding: 0.5rem;
    box-sizing: border-box;
    width: 100%;
    min-height: 5rem;
    height: 10rem;
    max-height: 20rem;
    resize: vertical;
    border-radius: 5px;
  }
  .message-length {
    color: lightgray;
    text-align: right;
  }
  .commit-btn {
    background-color: darkgreen;
    color: white;
    border-radius: 5px;
    margin-top: 1rem;
    padding: 0.5rem;
    border-color: rgba(118, 118, 118, 0.3);
  }
  .commit-btn.disabled {
    opacity: 0.5;
  }
</style>
