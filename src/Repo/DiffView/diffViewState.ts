import { state, withDefault } from "@react-rxjs/core";
import { createSignal, mergeWithKey } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  Observable,
  distinctUntilChanged,
  from,
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import {
  getFileChangeFiles,
  type Delta,
} from "../DetailPanel/activeCommitChangesState";
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
  image_mode: "SideBySide" | "Slide" | "Opacity";
}
export const [changeHunkOrFile$, changeHunkOrFile] =
  createSignal<DiffSettings["hunk_or_file"]>();
export const [changeSplitOrUnified$, changeSplitOrUnified] =
  createSignal<DiffSettings["split_or_unified"]>();
export const [changeImageDiffMode$, changeImageDiffMode] =
  createSignal<DiffSettings["image_mode"]>();
export const diffViewSettings$ = state(
  from(invoke<DiffSettings | null>("get_diff_settings")).pipe(
    switchMap((initialValue): Observable<DiffSettings> => {
      initialValue = initialValue ?? {
        hunk_or_file: "Hunk",
        split_or_unified: "Split",
        image_mode: "Slide",
      };

      return mergeWithKey({
        hunk_or_file: changeHunkOrFile$,
        split_or_unified: changeSplitOrUnified$,
        image_mode: changeImageDiffMode$,
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

type SelectedDeltaWithKind = {
  kind: "commit" | "staged" | "unstaged";
  delta: Delta;
};
export const [diffDeltaChange$, setDiffDelta] =
  createSignal<SelectedDeltaWithKind | null>();
const selectedDeltaWithKind$ = state(diffDeltaChange$);
export const selectedDelta$ = selectedDeltaWithKind$.pipeState(
  map((v) => v?.delta ?? null),
  distinctUntilChanged(),
  withDefault(null)
);
export const selectedDeltaKind$ = selectedDeltaWithKind$.pipeState(
  map((v) => v?.kind ?? null),
  withDefault(null)
);

export const diffDelta$ = selectedDelta$.pipeState(
  withLatestFrom(repoPath$),
  switchMap(([delta, path]) => {
    if (!delta || delta.binary) {
      return [null];
    }
    return from(invoke<DeltaDiff>("get_diff", { path, delta })).pipe(
      startWith(null)
    );
  })
);

const port$ = from(invoke<number>("get_port")).pipe(shareReplay(1));

export const deltaPaths$ = selectedDelta$.pipeState(
  withLatestFrom(repoPath$),
  switchMap((values) =>
    port$.pipe(
      map((port): [Delta | null, string | null, number] => [...values, port])
    )
  ),
  map(([delta, path, port]) => {
    if (!delta?.mime_type?.startsWith("image")) {
      return null;
    }
    const [old_file, new_file] = getFileChangeFiles(delta.change);
    const prefix = `http://localhost:${port}/raw/${encodeURIComponent(
      path ?? ""
    )}`;
    return {
      old: old_file && `${prefix}/${old_file.id}`,
      new:
        new_file &&
        `${prefix}/${new_file.id}?file=${encodeURIComponent(new_file.path)}`,
    };
  })
);
