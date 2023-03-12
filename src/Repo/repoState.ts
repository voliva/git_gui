import { listen$ } from "@/tauriRx";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api";
import {
  catchError,
  concat,
  connect,
  debounceTime,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  from,
  ignoreElements,
  map,
  merge,
  Observable,
  ObservableInput,
  share,
  skip,
  startWith,
  Subscription,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from "rxjs";

export const [triggerOpen$, openRepo] = createSignal();
export const repo_path$ = state(
  concat(
    defer(() => invoke<string | null>("get_last_repo")),
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
  commit: CommitInfo;
  descendants: Array<string>;
  position: number;
  color: number;
  paths: Array<BranchPath>;
}

const INITIAL_PAGE_SIZE = 2000; // Takes about ~100ms
const getCommits$ = (path: string) => {
  return invoke<PositionedCommit[]>("get_commits", {
    path,
    amount: INITIAL_PAGE_SIZE,
  });
};

const hasFocus$ = timer(0, 1000).pipe(
  map(() => document.hasFocus()),
  distinctUntilChanged()
);

export const [startFetch$, fetch] = createSignal();
export const isFetching$ = state(
  // merge(startFetch$, hasFocus$.pipe(filter((hasFocus) => hasFocus))).pipe(
  startFetch$.pipe(
    withLatestFrom(repo_path$),
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
      (path) => path.includes(".git/refs") || path.endsWith(".git/HEAD")
    )
  ),
  connect((shared$) =>
    hasFocus$.pipe(
      skip(1),
      switchMap((hasFocus) =>
        shared$.pipe(
          debounceTime(hasFocus ? 100 : 2_000),
          hasFocus ? startWith(null) : (v) => v
        )
      )
    )
  ),
  startWith(null)
);

export const commits$ = repo_path$.pipeState(
  switchMap((path) =>
    shouldUpdateRepo$.pipe(losslessExhaustMap(() => getCommits$(path!)))
  )
);

export const commitLookup$ = commits$.pipeState(
  map((commits) => {
    const result: Record<string, PositionedCommit> = {};
    commits.forEach(
      (positionedCommit) =>
        (result[positionedCommit.commit.id] = positionedCommit)
    );
    return result;
  })
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
  head: string;
  activeBranch: LocalRef | null;
  local: Array<LocalRef>;
  remotes: Record<string, Array<RemoteRef>>;
  tags: Array<LocalRef>;
}

const getRefs$ = (path: string) => invoke<Array<RustRef>>("get_refs", { path });
export const refs$ = repo_path$.pipeState(
  switchMap((path) =>
    shouldUpdateRepo$.pipe(losslessExhaustMap(() => getRefs$(path!)))
  ),
  map((refs) => {
    const result: Refs = {
      head: "",
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

const repoEvents$ = repo_path$.pipe(
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

const empty = Symbol("empty");
function losslessExhaustMap<T, R>(mapFn: (value: T) => ObservableInput<R>) {
  return (source$: Observable<T>) =>
    new Observable<R>((obs) => {
      let innerSub: Subscription | null = null;
      let missed: T | typeof empty = empty;
      let outerComplete = false;

      const subscribeInner = (value: T) => {
        innerSub = from(mapFn(value)).subscribe({
          next: (result) => obs.next(result),
          error: (error) => obs.error(error),
          complete: () => {
            innerSub = null;
            if (missed !== empty) {
              const tmp = missed;
              missed = empty;
              subscribeInner(tmp);
            } else if (outerComplete) {
              obs.complete();
            }
          },
        });
      };

      const outerSub = source$.subscribe({
        next: (value) => {
          if (!innerSub) {
            subscribeInner(value);
          } else {
            missed = value;
          }
        },
        error: (e) => obs.error(e),
        complete: () => {
          if (!innerSub) {
            obs.complete();
          } else {
            outerComplete = true;
          }
        },
      });

      return () => {
        innerSub?.unsubscribe();
        outerSub.unsubscribe();
      };
    });
}

// const losslessThrottle =
//   <T>(timeout: number) =>
//   (source$: Observable<T>) =>
//     new Observable<T>((obs) => {
//       let throttle: NodeJS.Timeout | null = null;
//       let missed: T | typeof empty = empty;

//       const emit = (value: T) => {
//         throttle = setTimeout(() => {
//           throttle = null;

//           if (missed !== empty) {
//             const tmp = missed;
//             missed = empty;
//             emit(tmp);
//           }
//         }, timeout);
//         obs.next(value);
//       };

//       const sub = source$.subscribe({
//         next: (v) => {
//           if (!throttle) {
//             emit(v);
//           } else {
//             missed = v;
//           }
//         },
//         error: (e) => obs.error(e),
//         complete: () => obs.complete,
//       });

//       return () => {
//         sub.unsubscribe();
//         if (throttle !== null) {
//           clearTimeout(throttle);
//         }
//       };
//     });
