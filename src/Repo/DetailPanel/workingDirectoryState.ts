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
import { repo_path$ } from "../repoState";
import { Delta } from "./activeCommitChangesState";

export interface WorkingDirStatus {
  unstaged_deltas: Delta[];
  staged_deltas: Delta[];
}

const [refresh$, refresh] = createSignal<void>();

export const workingDirectory$ = state(
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

export async function stage(delta?: Delta) {
  const path = await firstValueFrom(repo_path$);
  await invoke("stage", { delta, path });
  refresh();
}
export async function unstage(delta?: Delta) {
  const path = await firstValueFrom(repo_path$);
  await invoke("unstage", { delta, path });
  refresh();
}
