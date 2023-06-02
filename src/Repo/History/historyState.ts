import { state, withDefault } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Observable, concat, switchMap, withLatestFrom } from "rxjs";
import { repoPath$, type CommitInfo } from "../repoState";
import { invoke } from "@tauri-apps/api";

export const [viewHistoryChange$, viewHistory] = createSignal<{
  filePath: string;
  commitId?: string;
}>();

export const viewHistory$ = state(
  viewHistoryChange$.pipe(
    withLatestFrom(repoPath$),
    switchMap(
      ([options, path]): Observable<{
        file: string;
        result: Array<CommitInfo> | null;
      }> =>
        concat(
          [
            {
              file: options.filePath,
              result: null,
            },
          ],
          invoke<Array<CommitInfo>>("get_history", {
            ...options,
            path,
          }).then((result) => ({
            file: options.filePath,
            result,
          }))
        )
    )
  ),
  null
);

export const [selectedCommitChange$, selectCommit] = createSignal<string>();
export const selectedCommit$ = viewHistory$.pipeState(
  switchMap((viewHistory) =>
    viewHistory?.result?.length
      ? concat([viewHistory.result[0].id], selectedCommitChange$)
      : [null]
  ),
  withDefault(null)
);

export const selectedCommitDiff$ = selectedCommit$.pipeState(
  withLatestFrom(repoPath$, viewHistory$),
  switchMap(([id, path, viewHistory]) =>
    id
      ? concat(
          [null],
          invoke("get_history_diff", {
            id,
            path,
            filePath: viewHistory?.file,
          })
        )
      : [null]
  ),
  withDefault(null)
);
