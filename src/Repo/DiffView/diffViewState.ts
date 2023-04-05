import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import { from, startWith, switchMap, withLatestFrom } from "rxjs";
import type { Delta } from "../DetailPanel/activeCommitChangesState";
import { repoPath$ } from "../repoState";

export enum Side {
  OldFile = "OldFile",
  NewFile = "NewFile",
}

export interface Change {
  side: Side;
  line_num: number;
  change_type: string;
}
export interface Hunk {
  old_range: [number, number];
  new_range: [number, number];
  header: string;
}
export interface DeltaDiff {
  old_file?: string;
  new_file?: string;
  hunks: Array<Hunk>;
}

export const [diffDeltaChange$, setDiffDelta] = createSignal<Delta | null>();
export const selectedDelta$ = state(diffDeltaChange$, null);
export const diffDelta$ = selectedDelta$.pipeState(
  withLatestFrom(repoPath$),
  switchMap(([delta, path]) => {
    if (!delta) {
      return [null];
    }
    return from(invoke<DeltaDiff>("get_diff", { path, delta })).pipe(
      startWith(null)
    );
  })
);
