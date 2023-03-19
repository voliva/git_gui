import { map } from "rxjs";
import { LocalRef, refs$, RefType, RemoteRef } from "../repoState";

// e.g. { "abcdef1234": {...} }
export type RefsLookup = Record<string, RefGroups>;

// e.g. { "master": [...] }
export type RefGroups = Record<string, RefGroup>;

export interface RefGroup {
  name: string;
  refs: Partial<Record<RefType, Array<LookedUpRef>>>;
}

export type LookedUpRef =
  | { type: RefType.LocalBranch | RefType.Tag | RefType.Head; ref: LocalRef }
  | { type: RefType.RemoteBranch; ref: RemoteRef };

export const refsLookup$ = refs$.pipeState(
  map((refs): RefsLookup => {
    const result: RefsLookup = {};
    const getRefGroups = (commit: string) =>
      (result[commit] = result[commit] ?? {});
    const getRefGroup = (commit: string, name: string) => {
      const groups = getRefGroups(commit);
      return (groups[name] = groups[name] ?? { name, refs: {} });
    };
    const getRefGroupRefs = (commit: string, name: string, type: RefType) => {
      const group = getRefGroup(commit, name);
      return (group.refs[type] = group.refs[type] ?? []);
    };

    const headRef = (id: string): LookedUpRef => ({
      type: RefType.Head,
      ref: { id, is_head: true, name: "HEAD" },
    });
    if (refs.activeBranch) {
      const activeGroup = getRefGroup(
        refs.activeBranch.id,
        refs.activeBranch.name
      );
      if (refs.head) {
        activeGroup.refs[RefType.Head] = [headRef(refs.head)];
      }
    } else if (refs.head) {
      const headGroup = getRefGroup(refs.head, "HEAD");
      headGroup.refs[RefType.Head] = [headRef(refs.head)];
    }

    refs.local.forEach((localRef) => {
      getRefGroupRefs(localRef.id, localRef.name, RefType.LocalBranch).push({
        type: RefType.LocalBranch,
        ref: localRef,
      });
    });

    Object.values(refs.remotes)
      .flat()
      .forEach((remoteRef) => {
        getRefGroupRefs(
          remoteRef.id,
          remoteRef.name,
          RefType.RemoteBranch
        ).push({
          type: RefType.RemoteBranch,
          ref: remoteRef,
        });
      });

    refs.tags.forEach((tag) => {
      getRefGroupRefs(tag.id, tag.name, RefType.Tag).push({
        type: RefType.Tag,
        ref: tag,
      });
    });

    return result;
  })
);
