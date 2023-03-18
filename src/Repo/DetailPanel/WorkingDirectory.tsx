import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { listen$ } from "@/tauriRx";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  exhaustMap,
  firstValueFrom,
  map,
  merge,
  startWith,
  switchMap,
} from "rxjs";
import { For } from "solid-js";
import { repo_path$ } from "../repoState";
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
