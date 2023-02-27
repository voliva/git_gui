import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import { concat, defer, filter, from, map, switchMap, tap } from "rxjs";

export const [triggerOpen$, openRepo] = createSignal();
export const repo$ = state(
  concat(
    from(invoke<string | null>("get_repo_name")),
    triggerOpen$.pipe(switchMap(() => invoke<string | null>("open_repo")))
  ).pipe(
    filter((v) => Boolean(v)),
    map((v) => v!),
    tap((v) => console.log(v))
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

export const commits$ = state(
  defer(() => invoke<PositionedCommit[]>("get_commits"))
);
