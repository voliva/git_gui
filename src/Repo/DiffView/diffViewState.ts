import { state } from "@react-rxjs/core";
import { createSignal, mergeWithKey } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  Observable,
  distinctUntilChanged,
  from,
  scan,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
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

interface DiffSettings {
  hunk_or_file: "Hunk" | "File";
  split_or_unified: "Split" | "Unified";
}
export const [changeHunkOrFile$, changeHunkOrFile] =
  createSignal<DiffSettings["hunk_or_file"]>();
export const [changeSplitOrUnified$, changeSplitOrUnified] =
  createSignal<DiffSettings["split_or_unified"]>();
export const diffViewSettings$ = state(
  from(invoke<DiffSettings | null>("get_diff_settings")).pipe(
    switchMap((initialValue): Observable<DiffSettings> => {
      initialValue = initialValue ?? {
        hunk_or_file: "Hunk",
        split_or_unified: "Split",
      };

      return mergeWithKey({
        hunk_or_file: changeHunkOrFile$,
        split_or_unified: changeSplitOrUnified$,
      }).pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scan((acc: any, v) => {
          acc[v.type] = v.payload;
          return acc;
        }, initialValue),
        tap((settings) => invoke("set_diff_settings", { settings })),
        startWith(initialValue)
      );
    })
  )
);

export const [diffDeltaChange$, setDiffDelta] = createSignal<Delta | null>();
export const selectedDelta$ = state(
  diffDeltaChange$.pipe(distinctUntilChanged()),
  null
);
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
