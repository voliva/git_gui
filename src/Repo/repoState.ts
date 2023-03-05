import { listen$ } from "@/tauriRx";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import { concat, defer, filter, from, map, merge, switchMap } from "rxjs";

export const [triggerOpen$, openRepo] = createSignal();
export const repo_path$ = state(
  concat(
    from(invoke<string | null>("get_last_repo")),
    merge(
      triggerOpen$.pipe(
        switchMap(() => invoke<string | null>("open_repo")),
        filter((v) => v !== null)
      ),
      listen$<string>("repo_change").pipe(map((v) => v.payload))
    )
  ).pipe(
    filter((v) => Boolean(v)),
    map((v) => v!)
  ),
  null
);

export interface CommitInfo {
  id: string;
  summary: string | null;
  body: string | null;
  is_merge: boolean;
  time: number; // epoch seconds
}

export interface BranchPath {
  type: "Base" | "Parent" | "Follow";
  payload: number;
}

export interface PositionedCommit {
  commit: CommitInfo;
  position: number;
  color: number;
  paths: Array<[BranchPath, number]>;
}

export const commits$ = repo_path$.pipeState(
  switchMap((path) =>
    concat(
      invoke<PositionedCommit[]>("get_commits", { path, amount: 100 }),
      invoke<PositionedCommit[]>("get_commits", { path })
    )
  )
);
