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
  startWith,
  Subscription,
  switchMap,
  timer,
  withLatestFrom,
} from "rxjs";

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
  merge(startFetch$, hasFocus$.pipe(filter((hasFocus) => hasFocus))).pipe(
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

const shouldUpdateCommits$ = defer(() => repoEvents$).pipe(
  filter((v) => v.paths.some((path) => path.includes(".git/refs"))),
  connect((shared$) =>
    hasFocus$.pipe(
      switchMap((hasFocus) =>
        shared$.pipe(debounceTime(hasFocus ? 100 : 10_000))
      )
    )
  ),
  startWith(null)
);

export const commits$ = repo_path$.pipeState(
  switchMap((path) =>
    shouldUpdateCommits$.pipe(losslessExhaustMap(() => getCommits$(path!)))
  )
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
