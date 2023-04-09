import { invoke } from "@tauri-apps/api";
import { filter, from, startWith, switchMap, withLatestFrom } from "rxjs";
import { activeCommit$ } from "../RepoGrid/activeCommit";
import { repoPath$ } from "../repoState";

export interface File {
  id: string;
  path: string;
}

export type FileChange =
  | { Added: File }
  | { Untracked: File }
  | { Copied: [File, File] }
  | { Deleted: File }
  | { Renamed: [File, File] }
  | { Modified: [File, File] };

export interface Delta {
  change: FileChange;
  binary: boolean;
  mime_type?: string;
}

export interface CommitContents {
  insertions: number;
  deletions: number;
  deltas: Array<Delta>;
}

export const commitChanges$ = activeCommit$.pipeState(
  filter((v) => v !== null),
  withLatestFrom(repoPath$),
  switchMap(([id, path]) =>
    from(invoke<CommitContents>("get_commit", { path, id })).pipe(
      startWith(null)
    )
  )
);

export function switchChangeType<T>(
  value: FileChange,
  options: Record<
    "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
    (content: File[]) => T
  >
): T;
export function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue: T
): T;
export function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Untracked" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue?: T
): T {
  if ("Added" in value && options.Added) {
    return options.Added([value.Added]);
  }
  if ("Untracked" in value && options.Untracked) {
    return options.Untracked([value.Untracked]);
  }
  if ("Copied" in value && options.Copied) {
    return options.Copied(value.Copied);
  }
  if ("Deleted" in value && options.Deleted) {
    return options.Deleted([value.Deleted]);
  }
  if ("Renamed" in value && options.Renamed) {
    return options.Renamed(value.Renamed);
  }
  if ("Modified" in value && options.Modified) {
    return options.Modified(value.Modified);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return defaultValue!;
}

export const getFileChangeFiles = (value: FileChange) =>
  switchChangeType(value, {
    Added: ([file]) => [null, file],
    Untracked: ([file]) => [null, file],
    Copied: (files) => files,
    Deleted: ([file]) => [file, null],
    Renamed: (files) => files,
    Modified: (files) => files,
  });
