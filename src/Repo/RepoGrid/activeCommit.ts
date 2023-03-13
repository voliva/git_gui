import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { combineLatest, concat, map, Observable, take } from "rxjs";
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

  function searchUp(targetId: string, cacheEnabled: boolean) {
    if (targetId in cache) return cache[targetId];

    /**
     * Search up through the graph.
     * If you find a commit that's already cached:
     *  -> If it's "false", abandon that branch
     *  -> If it's "true", then mark all the ones from that branch as true
     * If active is not found before it exceeds the timestamp, then mark everything as "false"
     * => Be mindful of commits with the same timestamp as the active one. Ignore the cache on those ones.
     */
    const visited = new Set<string>();
    const toVisit: Array<{
      id: string;
      cacheEnabled: boolean;
      prev: number | null;
    }> = [{ id: targetId, cacheEnabled, prev: null }];
    for (let i = 0; i < toVisit.length; i++) {
      const { id, cacheEnabled, prev } = toVisit[i];
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);

      function markAsFound() {
        let current = prev;
        while (current !== null) {
          cache[toVisit[current].id] = true;
          current = toVisit[current].prev;
        }
      }
      if (id === activeId) {
        markAsFound();
        return true;
      }
      if (cacheEnabled && id in cache) {
        if (cache[id]) {
          markAsFound();
          return cache[id];
        }
        continue;
      }

      const targetCommit = commits[id];
      for (let id of targetCommit.descendants) {
        const descendant = commits[id];
        if (!descendant) continue;

        if (descendant.commit.time <= activeCommitTime) {
          toVisit.push({
            id,
            prev: i,
            cacheEnabled:
              cacheEnabled && descendant.commit.time < activeCommitTime,
          });
        }
      }
    }

    toVisit.forEach(({ id, cacheEnabled }) => {
      if (cacheEnabled) {
        cache[id] = false;
      }
    });
    return false;
  }
  function searchDown(targetId: string, cacheEnabled: boolean) {
    if (targetId in cache) return cache[targetId];

    const visited = new Set<string>();
    const toVisit: Array<{
      id: string;
      cacheEnabled: boolean;
      prev: number | null;
    }> = [{ id: targetId, cacheEnabled, prev: null }];
    for (let i = 0; i < toVisit.length; i++) {
      const { id, cacheEnabled, prev } = toVisit[i];
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);

      function markAsFound() {
        let current = prev;
        while (current !== null) {
          cache[toVisit[current].id] = true;
          current = toVisit[current].prev;
        }
      }
      if (id === activeId) {
        markAsFound();
        return true;
      }
      if (cacheEnabled && id in cache) {
        if (cache[id]) {
          markAsFound();
          return cache[id];
        }
        continue;
      }

      const targetCommit = commits[id];
      for (let id of targetCommit.commit.parents) {
        const parent = commits[id];
        if (!parent) continue;

        if (parent.commit.time >= activeCommitTime) {
          toVisit.push({
            id,
            prev: i,
            cacheEnabled: cacheEnabled && parent.commit.time > activeCommitTime,
          });
        }
      }
    }

    toVisit.forEach(({ id, cacheEnabled }) => {
      if (cacheEnabled) {
        cache[id] = false;
      }
    });
    return false;
  }

  const targetCommit = commits[targetId];

  if (targetCommit.commit.time < activeCommitTime) {
    return searchUp(targetId, true);
  }
  if (targetCommit.commit.time > activeCommitTime) {
    return searchDown(targetId, true);
  }

  return searchUp(targetId, false) || searchDown(targetId, false);
}

export const isRelatedToActive$ = state(
  (id: string): Observable<boolean> =>
    combineLatest({
      cache: relatedCache$,
      commits: commitLookup$,
    }).pipe(
      map(({ cache, commits }) => {
        // console.log("calculate", id);
        return getIsActive(cache.id, cache.relatedLookup, commits, id);
      })
      // tap({
      //   subscribe: () => {
      //     console.log("subscribe", id);
      //   },
      //   unsubscribe: () => {
      //     console.log("finalize", id);
      //   },
      // })
    )
);
