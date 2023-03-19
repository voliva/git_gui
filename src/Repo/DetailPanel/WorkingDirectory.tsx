import { FullTabs, FullTab, FullTabProps } from "@/components/Tabs/FullTabs";
import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { listen$ } from "@/tauriRx";
import { state, withDefault } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  combineLatest,
  distinctUntilChanged,
  exhaustMap,
  filter,
  firstValueFrom,
  map,
  merge,
  startWith,
  switchMap,
} from "rxjs";
import { For, createSignal as solidCreateSignal, createEffect } from "solid-js";
import { setActiveCommit } from "../RepoGrid/activeCommit";
import { commitLookup$, refs$, repo_path$ } from "../repoState";
import { Delta } from "./ActiveCommitChanges";
import { DeltaSummary } from "./DeltaSummaryLine";
import * as classes from "./WorkingDirectory.css";

interface WorkingDirStatus {
  unstaged_deltas: Delta[];
  staged_deltas: Delta[];
}

const [refresh$, refresh] = createSignal<void>();
const workingDirectory$ = state(
  merge(
    listen$<WorkingDirStatus>("working-directory").pipe(
      map((evt) => evt.payload)
    ),
    repo_path$.pipe(
      switchMap((path) =>
        refresh$.pipe(
          startWith(null),
          exhaustMap(() =>
            invoke<WorkingDirStatus>("get_working_dir", { path })
          )
        )
      )
    )
  )
);

async function stage(delta?: Delta) {
  const path = await firstValueFrom(repo_path$);
  await invoke("stage", { delta, path });
  refresh();
}
async function unstage(delta?: Delta) {
  const path = await firstValueFrom(repo_path$);
  await invoke("unstage", { delta, path });
  refresh();
}

export const WorkingDirectory = () => {
  const result = readState(workingDirectory$);

  return (
    <div class={classes.workingDirectory}>
      <StagingList
        title="Unstaged changes"
        deltas={result()?.unstaged_deltas ?? []}
        onSelectAll={stage}
        onSelect={stage}
      />
      <StagingList
        title="Staged changes"
        deltas={result()?.staged_deltas ?? []}
        checked
        onSelectAll={unstage}
        onSelect={unstage}
      />
      <CreateCommit />
    </div>
  );
};

const StagingList = (props: {
  title: string;
  deltas: Delta[];
  checked?: boolean;
  onSelectAll?: () => void;
  onSelect?: (delta: Delta) => void;
}) => {
  return (
    <div class={classes.stagingListContainer}>
      <div class={classes.stagingListHeader}>
        <div>{props.title}</div>
        <input
          type="checkbox"
          checked={props.checked}
          disabled={props.deltas.length === 0}
          onClick={(evt) => {
            evt.preventDefault();
            props.onSelectAll?.();
          }}
          title={props.checked ? "deselect all" : "select all"}
        />
      </div>
      <ul class={classes.stagingList}>
        <For each={props.deltas}>
          {(delta) => (
            <DeltaSummary delta={delta}>
              <input
                type="checkbox"
                checked={props.checked}
                onClick={(evt) => {
                  evt.preventDefault();
                  props.onSelect?.(delta);
                }}
              />
            </DeltaSummary>
          )}
        </For>
      </ul>
    </div>
  );
};

const headMessage$ = refs$.pipe(
  switchMap(({ head }) =>
    commitLookup$.pipe(
      map((lookup) => lookup[head]),
      filter((v) => !!v),
      map((positionedCommit) => positionedCommit.commit),
      map((commit) =>
        commit.body ? `${commit.summary}\n${commit.body}` : commit.summary ?? ""
      )
    )
  )
);

enum CommitTab {
  New,
  Amend,
}

const [commitMessageChange$, setCommitMessage] = createSignal<string>();
const commitMessage$ = state(commitMessageChange$, "");
const [activeTabChange$, setActiveTab] = createSignal<CommitTab>();
const activeTab$ = state(activeTabChange$, CommitTab.New);
const commitBtnDisabled$ = state(
  combineLatest({
    activeTab: activeTab$,
    hasCommitMessage: commitMessage$.pipe(map((v) => v !== "")),
    hasStagedChanges: workingDirectory$.pipe(
      map(({ staged_deltas }) => staged_deltas.length > 0)
    ),
  }).pipe(
    map(({ activeTab, hasCommitMessage, hasStagedChanges }) => {
      if (activeTab === CommitTab.New) {
        // TODO it's posible to make a commit without changes with merge commits
        return !hasCommitMessage || !hasStagedChanges;
      } else {
        return !hasCommitMessage;
      }
    })
  ),
  true
);
const messageLength$ = commitMessage$.pipeState(
  map((msg) => {
    const firstLineBreak = msg.indexOf("\n");
    if (firstLineBreak < 0) {
      return {
        summary: msg.length,
        body: 0,
      };
    }
    return {
      summary: firstLineBreak,
      body: msg.length - firstLineBreak - 1,
    };
  }),
  withDefault({ summary: 0, body: 0 })
);

const CreateCommit = () => {
  const activeTab = readState(activeTab$);
  const [modified, setModified] = solidCreateSignal<boolean>();
  const [ref, setRef] = solidCreateSignal<HTMLTextAreaElement>();
  const commitBtnDisabled = readState(commitBtnDisabled$);
  const messageLength = readState(messageLength$);

  const getMessageLength = () => {
    const ml = messageLength();
    if (ml.body === 0) {
      return `${ml.summary}`;
    } else {
      return `${ml.summary} + ${ml.body} = ${ml.summary + ml.body}`;
    }
  };

  const setMessageToPreviousCommit = async () => {
    const message = await firstValueFrom(headMessage$);
    const r = ref();
    if (r) {
      r.value = message;
      setCommitMessage(r.value);
    }
  };
  const resetMessageToDefault = () => {
    const r = ref();
    if (r) {
      r.value = "";
      setCommitMessage(r.value);
    }
  };
  const isNewCommitDisabled = () =>
    activeTab() === CommitTab.Amend && modified();
  // TODO amendDisabled if no head commit (initial commit or orphan branch)
  const isAmendDisabled = () => activeTab() === CommitTab.New && modified();

  return (
    <div class={qs("verticalFlex")}>
      <FullTabs
        onTabChange={(tab) => {
          setActiveTab(
            tab.header === "New Commit" ? CommitTab.New : CommitTab.Amend
          );
        }}
      >
        <FullTab
          header="New Commit"
          disabled={isNewCommitDisabled()}
          onActive={resetMessageToDefault}
        >
          {null}
        </FullTab>
        <FullTab
          header="Amend previous"
          disabled={isAmendDisabled()}
          onActive={setMessageToPreviousCommit}
        >
          {null}
        </FullTab>
      </FullTabs>
      <textarea
        class={classes.commitMessageArea}
        ref={setRef}
        placeholder="Commit message"
        onInput={(evt) => {
          setCommitMessage(evt.currentTarget.value);
          setModified(evt.currentTarget.value !== "");
        }}
      ></textarea>
      <div class={classes.messageLength}>{getMessageLength()}</div>
      <button
        class={classes.commitBtn}
        disabled={commitBtnDisabled()}
        onClick={async () => {
          const path = await firstValueFrom(repo_path$);
          const message = await firstValueFrom(commitMessage$);
          const id = await invoke<string>("commit", {
            path,
            message,
            amend: activeTab() === CommitTab.Amend,
          });
          resetMessageToDefault();
          // TODO reset active tab to new commit
          await firstValueFrom(
            commitLookup$.pipe(filter((lookup) => Boolean(lookup[id])))
          );
          setActiveCommit(id);
        }}
      >
        Commit
      </button>
    </div>
  );
};
