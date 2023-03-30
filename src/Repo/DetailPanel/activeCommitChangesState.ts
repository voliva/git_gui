import { invoke } from "@tauri-apps/api";
import {
  filter,
  firstValueFrom,
  from,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import { activeCommit$ } from "../RepoGrid/activeCommit";
import { repoPath$ } from "../repoState";

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

export interface CommitContents {
  insertions: number;
  deletions: number;
  deltas: Array<Delta>;
}

export const commitChanges$ = activeCommit$.pipeState(
  filter((v) => v !== null),
  withLatestFrom(repoPath$),
  switchMap(([id, path]) =>
    from(invoke<CommitContents>("get_commit", { path, id })).pipe(
      startWith(null)
    )
  ),
  tap(async (v) => {
    if (v) {
      const path = await firstValueFrom(repoPath$);
      invoke("get_diff", { path, delta: v.deltas[0] }).then((res) =>
        console.log(res)
      );
    }
  })
);
