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
  targetId: string,
  direction: number
): boolean {
  if (targetId === activeId) return true;
  if (targetId in cache) return cache[targetId];

  const activeCommitTime = commits[activeId].commit.time;
  const targetCommit = commits[targetId];
  const parents = targetCommit.commit.parents.filter(
    (id) => commits[id].commit.time >= activeCommitTime
  );
  const descendants = targetCommit.descendants.filter(
    (id) => commits[id].commit.time <= activeCommitTime
  );

  if (direction === 0 && targetCommit.commit.time === activeCommitTime) {
    const result =
      parents.some((id) => getIsActive(activeId, cache, commits, id, 0)) ||
      descendants.some((id) => getIsActive(activeId, cache, commits, id, 0));
    cache[targetId] = result;
    // console.log(targetId.substring(0, 6), "both", result);
    return result;
  }
  if (direction >= 0 && targetCommit.commit.time >= activeCommitTime) {
    const result = parents.some((id) =>
      getIsActive(activeId, cache, commits, id, 1)
    );
    cache[targetId] = result;
    // console.log(targetId.substring(0, 6), "parents", result);
    return result;
  }
  if (direction <= 0 && targetCommit.commit.time <= activeCommitTime) {
    const result = descendants.some((id) =>
      getIsActive(activeId, cache, commits, id, -1)
    );
    cache[targetId] = result;
    // console.log(targetId.substring(0, 6), "descendants", result);
    return result;
  }
  // console.log(
  //   targetId.substring(0, 6),
  //   "nomatch",
  //   direction,
  //   targetCommit.commit.time,
  //   activeCommitTime
  // );
  cache[targetId] = false;
  return false;
}

export const isRelatedToActive$ = state(
  (id: string): Observable<boolean> =>
    combineLatest({
      cache: relatedCache$,
      commits: commitLookup$,
    }).pipe(
      map(({ cache, commits }) =>
        getIsActive(cache.id, cache.relatedLookup, commits, id, 0)
      )
    )
);
