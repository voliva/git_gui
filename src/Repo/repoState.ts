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

export interface SignatureInfo {
  name: string | null;
  email: string | null;
  hash: string | null;
  time: number; // epoch seconds
}

export interface CommitInfo {
  id: string;
  summary: string | null;
  body: string | null;
  is_merge: boolean;
  time: number; // epoch seconds
  author: SignatureInfo;
  committer: SignatureInfo;
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

const INITIAL_PAGE_SIZE = 5000; // Takes about ~100ms
export const commits$ = repo_path$.pipeState(
  switchMap((path) =>
    invoke<PositionedCommit[]>("get_commits", {
      path,
      amount: INITIAL_PAGE_SIZE,
    })
  )
);
