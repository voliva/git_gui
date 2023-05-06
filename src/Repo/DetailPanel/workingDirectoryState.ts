import { listen$ } from "@/lib/tauriRx";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { firstValueFrom, map, merge, switchMap } from "rxjs";
import { repoPath$ } from "../repoState";
import type { Delta } from "./activeCommitChangesState";

export interface WorkingDirStatus {
  unstaged_deltas: Delta[];
  staged_deltas: Delta[];
}

export const workingDirectory$ = state(
  merge(
    listen$<WorkingDirStatus>("working-directory").pipe(
      map((evt) => evt.payload)
    ),
    repoPath$.pipe(
      switchMap((path) => invoke<WorkingDirStatus>("get_working_dir", { path }))
    )
  )
);

export async function stage(delta?: Delta) {
  const path = await firstValueFrom(repoPath$);
  await invoke("stage", { delta, path });
}
export async function unstage(delta?: Delta) {
  const path = await firstValueFrom(repoPath$);
  await invoke("unstage", { delta, path });
}
