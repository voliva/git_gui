import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { invoke } from "@tauri-apps/api";
import { from, startWith, switchMap, withLatestFrom } from "rxjs";
import { For, Show } from "solid-js";
import * as classes from "./ActiveCommitChanges.css";
import { activeCommit$ } from "../RepoGrid/activeCommit";
import { repo_path$ } from "../repoState";
import { DeltaSummary } from "./DeltaSummaryLine";

export interface File {
  id: string;
  path: string;
}

export type FileChange =
  | { Added: File }
  | { Untracked: File }
  | { Copied: [File, File] }
  | { Deleted: File }
  | { Renamed: [File, File] }
  | { Modified: [File, File] };

export interface Delta {
  change: FileChange;
  binary: boolean;
}

interface CommitContents {
  insertions: number;
  deletions: number;
  deltas: Array<Delta>;
}

const commitChanges$ = activeCommit$.pipeState(
  withLatestFrom(repo_path$),
  switchMap(([id, path]) =>
    from(invoke<CommitContents>("get_commit", { path, id })).pipe(
      startWith(null)
    )
  )
);

export const ActiveCommitChanges = () => {
  const changes = readState(commitChanges$, null);

  return (
    <Show when={changes()}>
      <div class={classes.commitChangeContainer}>
        <ChangeCount changes={changes()!} />
        <div class={qs("boxFill", "overflowVertical")}>
          <ul>
            <For each={changes()!.deltas}>
              {(delta) => <DeltaSummary delta={delta} />}
            </For>
          </ul>
        </div>
      </div>
    </Show>
  );
};

const ChangeCount = (props: { changes: CommitContents }) => {
  const getWidth = (value: number) => {
    const maxAmount = Math.max(
      100,
      props.changes.deletions,
      props.changes.insertions
    );
    return Math.round((1000 * value) / maxAmount) / 10 + "%";
  };

  return (
    <div class={qs("boxAuto", "horizontalFlex")}>
      <div class={qs("boxFill")}>Files: {props.changes.deltas.length}</div>
      <div class={qs("horizontalFlex", "centeredFlex")}>
        <span class={classes.deletions}>{props.changes.deletions}</span>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.deletion}
            style={{
              width: getWidth(props.changes.deletions),
            }}
          />
        </div>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.insertion}
            style={{
              width: getWidth(props.changes.insertions),
            }}
          />
        </div>
        <span class={classes.insertions}>{props.changes.insertions}</span>
      </div>
    </div>
  );
};
