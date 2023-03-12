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

  function searchUp(targetId: string) {
    if (targetId === activeId) return true;

    const targetCommit = commits[targetId];
    if (targetId in cache && targetCommit.commit.time !== activeCommitTime)
      return cache[targetId];

    const descendants = targetCommit.descendants.filter(
      (id) => commits[id].commit.time <= activeCommitTime
    );

    const result = descendants.some(searchUp);
    // console.log("descendants", targetId, descendants, result);
    if (result) {
      cache[targetId] = result;
    }
    return result;
  }
  function searchDown(targetId: string) {
    if (targetId === activeId) return true;

    const targetCommit = commits[targetId];
    if (targetId in cache && targetCommit.commit.time !== activeCommitTime)
      return cache[targetId];

    const parents = targetCommit.commit.parents.filter(
      (id) => commits[id].commit.time >= activeCommitTime
    );

    const result = parents.some(searchDown);
    if (result) {
      cache[targetId] = result;
    }
    return result;
  }

  const targetCommit = commits[targetId];

  if (targetCommit.commit.time < activeCommitTime) {
    // console.log("searchUp", targetId);
    return searchUp(targetId);
  }
  if (targetCommit.commit.time > activeCommitTime) {
    // console.log("searchDown", targetId);
    return searchDown(targetId);
  }

  // console.log("searchBoth", targetId);
  const result = searchUp(targetId) || searchDown(targetId);

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
