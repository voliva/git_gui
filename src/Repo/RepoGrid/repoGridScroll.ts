import { combineLatest, map, filter, take, delay } from "rxjs";
import { writable } from "svelte/store";
import { commits$ } from "../repoState";
import { activeCommit$ } from "./activeCommit";

export const scrollStore = writable<number | null>(null);

export const initialScrollIdx$ = combineLatest([commits$, activeCommit$]).pipe(
  map(([commits, activeCommit]) =>
    commits.findIndex((commit) => commit.id === activeCommit)
  ),
  filter((v) => v >= 0),
  take(1),
  // TODO seems like it doesn't like it if the view is updating with that commit
  delay(100)
);
