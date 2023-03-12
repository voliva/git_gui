import { state, StateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import {
  combineLatest,
  concat,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from "rxjs";
import { commitLookup$, PositionedCommit, refs$ } from "../repoState";

export const [commitChange$, setActiveCommit] = createSignal<string>();
export const activeCommit$ = state(
  concat(
    refs$.pipe(
      map((refs) => refs.head),
      take(1)
    ),
    commitChange$
  )
);

const relatedCache$ = activeCommit$.pipeState(
  map((id) => ({
    id,
    relatedLookup: {} as Record<string, boolean>,
  }))
);

export function getIsActive(
  activeId: string,
  cache: Record<string, boolean>,
  commits: Record<string, PositionedCommit>,
  targetId: string
): boolean {
  if (targetId === activeId) return true;
  if (targetId in cache) return cache[targetId];

  const activeCommitTime = commits[activeId].commit.time;

  function searchUp(targetId: string, persist: boolean) {
    if (targetId === activeId) return true;
    if (targetId in cache) return cache[targetId];

    const targetCommit = commits[targetId];
    const descendants = targetCommit.descendants.filter(
      (id) => commits[id].commit.time <= activeCommitTime
    );

    const result = descendants.some((id) => searchUp(id, persist));
    // console.log("descendants", targetId, descendants, result);
    if (persist && targetCommit.commit.parents.length <= 1) {
      // TODO why parents and not descendants?
      // Is there a test I can make this fail because it has more than 1 descendant, but only 1 parent?
      cache[targetId] = result;
    }
    return result;
  }
  function searchDown(targetId: string, persist: boolean) {
    if (targetId === activeId) return true;
    if (targetId in cache) return cache[targetId];

    const targetCommit = commits[targetId];
    const parents = targetCommit.commit.parents.filter(
      (id) => commits[id].commit.time >= activeCommitTime
    );

    const result = parents.some((id) => searchDown(id, persist));
    if (persist && targetCommit.commit.parents.length <= 1) {
      cache[targetId] = result;
    }
    return result;
  }

  const targetCommit = commits[targetId];

  if (targetCommit.commit.time < activeCommitTime) {
    // console.log("searchUp", targetId);
    return searchUp(targetId, true);
  }
  if (targetCommit.commit.time > activeCommitTime) {
    // console.log("searchDown", targetId);
    return searchDown(targetId, true);
  }

  // console.log("searchBoth", targetId);
  const result = searchUp(targetId, false) || searchDown(targetId, false);

  return result;
}

export const isRelatedToActive$ = state(
  (id: string): Observable<boolean> =>
    combineLatest({
      cache: relatedCache$,
      commits: commitLookup$,
    }).pipe(
      map(({ cache, commits }) =>
        getIsActive(cache.id, cache.relatedLookup, commits, id)
      )
    )
);
