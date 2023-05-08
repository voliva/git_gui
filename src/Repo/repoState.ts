import {
  isNotNullish,
  losslessExhaustMap,
  losslessThrottle,
} from "@/lib/rxState";
import { listen$, streamCommand$ } from "@/lib/tauriRx";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  EMPTY,
  catchError,
  concat,
  connect,
  debounceTime,
  defer,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  from,
  ignoreElements,
  map,
  merge,
  scan,
  share,
  startWith,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from "rxjs";

export const [triggerOpen$, openRepo] = createSignal();
export const repoPath$ = state(
  concat(
    defer(() => invoke<string | null>("get_last_repo")),
    merge(
      triggerOpen$.pipe(
        switchMap(() => invoke<string | null>("open_repo")),
        filter((v) => v !== null)
      ),
      listen$<string>("repo_change").pipe(map((v) => v.payload))
    )
  ).pipe(filter(isNotNullish)),
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
  parents: string[];
  time: number; // epoch seconds
  author: SignatureInfo;
  committer: SignatureInfo;
}

export interface BranchPath {
  type: "Base" | "Parent" | "Follow";
  payload: number;
}

export interface PositionedCommit {
  id: string;
  commit: CommitInfo;
  descendants: Array<string>;
  position: number;
  color: number;
  paths: Array<BranchPath>;
}

const hasFocus$ = timer(0, 1000).pipe(
  map(() => document.hasFocus()),
  distinctUntilChanged()
);

export const [startFetch$, fetch] = createSignal();
export const isFetching$ = state(
  // merge(startFetch$, hasFocus$.pipe(filter((hasFocus) => hasFocus))).pipe(
  startFetch$.pipe(
    withLatestFrom(repoPath$),
    losslessExhaustMap(([, path]) =>
      concat(
        [true],
        defer(() => invoke("fetch", { path })).pipe(
          catchError((err) => {
            console.error(err);
            return EMPTY;
          }),
          ignoreElements()
        ),
        [false]
      )
    )
  ),
  false
);

const shouldUpdateRepo$ = defer(() => repoEvents$).pipe(
  filter((v) =>
    v.paths.some(
      (path) =>
        path.includes(".git/refs") ||
        path.endsWith(".git/HEAD") ||
        path.includes(".git\\refs") ||
        path.endsWith(".git\\HEAD")
    )
  ),
  connect((shared$) =>
    hasFocus$.pipe(
      switchMap((hasFocus, i) =>
        shared$.pipe(
          debounceTime(hasFocus ? 100 : 2_000),
          hasFocus || i === 0 ? startWith(null) : (v) => v
        )
      )
    )
  )
);

const commitEvent$ = repoPath$.pipe(
  switchMap((path) =>
    shouldUpdateRepo$.pipe(
      exhaustMap(() =>
        concat(
          [{ type: "start" as const }],
          streamCommand$<Omit<PositionedCommit, "id">>("get_commits", {
            path,
          }).pipe(
            map((payload) => ({
              type: "update" as const,
              payload: {
                ...payload,
                id: payload.commit.id,
              },
            }))
          ),
          [{ type: "end" as const }]
        )
      )
    )
  ),
  share()
);

export const commits$ = state(
  commitEvent$.pipe(
    scan(
      (acc, event) => {
        switch (event.type) {
          case "start":
            return {
              array: acc.array,
              i: 0,
            };
          case "update":
            acc.array[acc.i] = event.payload;
            return {
              array: acc.array,
              i: acc.i + 1,
            };
          case "end":
            acc.array.length = acc.i;
            return acc;
        }
      },
      {
        array: [] as PositionedCommit[],
        i: 0,
      }
    ),
    map(({ array }) => array),
    losslessThrottle(30),
    map((v) => [...v])
  )
);

export const commitLookup$ = commits$.pipeState(
  take(1),
  map((commits) => {
    const result: Record<string, PositionedCommit> = {};
    commits.forEach(
      (positionedCommit) =>
        (result[positionedCommit.commit.id] = positionedCommit)
    );
    return result;
  }),
  switchMap((initialMap) =>
    commitEvent$.pipe(
      filter((event) => event.type === "update"),
      map((event) => {
        if (event.type !== "update") return initialMap;
        initialMap[event.payload.commit.id] = event.payload;
        return initialMap;
      }),
      startWith(initialMap)
    )
  ),
  losslessThrottle(30),
  map((v) => ({ ...v }))
);

export interface LocalRef {
  id: string;
  name: string;
  is_head: boolean;
}
export interface RemoteRef {
  id: string;
  remote: string;
  name: string;
}

export enum RefType {
  Head = "Head",
  LocalBranch = "LocalBranch",
  RemoteBranch = "RemoteBranch",
  Tag = "Tag",
}

type RustRef =
  | { type: RefType.Head; payload: string }
  | { type: RefType.LocalBranch; payload: LocalRef }
  | { type: RefType.RemoteBranch; payload: RemoteRef }
  | { type: RefType.Tag; payload: LocalRef };

export interface Refs {
  head: string | null;
  activeBranch: LocalRef | null;
  local: Array<LocalRef>;
  remotes: Record<string, Array<RemoteRef>>;
  tags: Array<LocalRef>;
}

const getRefs$ = (path: string) => invoke<Array<RustRef>>("get_refs", { path });
export const refs$ = repoPath$.pipeState(
  filter(isNotNullish),
  switchMap((path) =>
    shouldUpdateRepo$.pipe(
      losslessExhaustMap(() =>
        from(getRefs$(path)).pipe(
          catchError((err) => {
            console.error(err);
            console.error("Error happened on `refs$`");
            return EMPTY;
          })
        )
      )
    )
  ),
  map((refs) => {
    const result: Refs = {
      head: null,
      activeBranch: null,
      local: [],
      remotes: {},
      tags: [],
    };

    refs.forEach((ref) => {
      switch (ref.type) {
        case "Head":
          result.head = ref.payload;
          break;
        case "LocalBranch":
          result.local.push(ref.payload);
          if (ref.payload.is_head) {
            result.activeBranch = ref.payload;
          }
          break;
        case "RemoteBranch":
          result.remotes[ref.payload.remote] =
            result.remotes[ref.payload.remote] || [];
          result.remotes[ref.payload.remote].push(ref.payload);
          break;
        case "Tag":
          result.tags.push(ref.payload);
          break;
      }
    });

    Object.keys(result.remotes).forEach((remote) =>
      result.remotes[remote]?.sort((a, b) => a.name.localeCompare(b.name))
    );

    result.local.sort((a, b) => a.name.localeCompare(b.name));
    result.tags.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  })
);

enum AccessMode {
  Any = "any",
  Execute = "execute",
  Read = "read",
  Write = "write",
  Other = "other",
}

type AccessKind =
  | "any"
  | "read"
  | { open: AccessMode }
  | { close: AccessMode }
  | "other";

enum CreateKind {
  Any = "any",
  File = "file",
  Folder = "folder",
  Other = "other",
}

type EventKind =
  | "any"
  | { access: AccessKind }
  | { create: CreateKind }
  // I got tired of translating, and I won't probably need it *_*
  | { modify: unknown }
  | { remove: unknown }
  | "other";

interface WatchNotification {
  paths: string[];
  type: EventKind;
}

const repoEvents$ = repoPath$.pipe(
  distinctUntilChanged(),
  switchMap((path) => {
    if (!path) return EMPTY;
    // Note: The BE only supports one watch at a time.
    invoke("watch_repo", { path });
    return listen$<WatchNotification>("watcher_notification").pipe(
      finalize(() => invoke("stop_watch_repo")),
      map((v) => v.payload)
    );
  }),
  share()
);
