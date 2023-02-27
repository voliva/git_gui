import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import { concat, from, switchMap, filter, map, tap } from "rxjs";

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
