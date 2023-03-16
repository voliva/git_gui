import { FullTab, FullTabs } from "@/components/Tabs/FullTabs";
import { qs } from "@/quickStyles";
import { readState } from "@/rxState";
import { state } from "@react-rxjs/core";
import { invoke } from "@tauri-apps/api";
import { writeText } from "@tauri-apps/api/clipboard";
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  from,
  map,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs";
import { AiOutlineCopy, AiOutlineFileAdd } from "solid-icons/ai";
import {
  OcFileadded2,
  OcFilediff2,
  OcFilemoved2,
  OcFileremoved2,
  OcFilesymlinkfile2,
} from "solid-icons/oc";
import { createSignal, For, JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useTippy } from "solid-tippy";
import * as classes from "./DetailPanel.css";
import {
  changeColor,
  negativeColor,
  neutralColor,
  positiveColor,
} from "./DetailPanel.css";
import { activeCommit$, setActiveCommit } from "./RepoGrid/activeCommit";
import {
  CommitInfo,
  commitLookup$,
  repo_path$,
  SignatureInfo,
} from "./repoState";

export const DetailPanel = () => {
  return (
    <FullTabs class={classes.detailPanelContainer}>
      <FullTab header="Details">
        <Details />
      </FullTab>
      <FullTab header="Working Directory">
        <WorkingDirectory />
      </FullTab>
    </FullTabs>
  );
};

const commit$ = state(
  combineLatest([activeCommit$, commitLookup$]).pipe(
    filter(([id, commits]) => id in commits),
    map(([id, commits]) => commits[id].commit),
    distinctUntilChanged()
  )
);

const Details = () => {
  const commit = readState(commit$, null);

  return (
    <Show when={commit()}>
      <div class={qs("boxFill", "verticalFlex", "noOverflow")}>
        <CommitDetails commit={commit()!} />
        <ActiveCommitChanges />
      </div>
    </Show>
  );
};

const CommitDetails = (props: { commit: CommitInfo }) => {
  const [anchor, setAnchor] = createSignal<HTMLDivElement>();
  const [copied, setCopied] = createSignal(false);

  useTippy(anchor, {
    hidden: true,
    props: {
      content: (<div>{copied() ? "Copied" : "Copy full hash"}</div>) as Element,
      hideOnClick: false,
      onHidden: () => setCopied(false),
    },
  });

  return (
    <div class={classes.commitDetails}>
      <div class={classes.commitText}>
        <h4>{props.commit.summary}</h4>
        <p>{props.commit.body}</p>
      </div>
      <div class={qs("horizontalFlex")}>
        <div class={qs("boxFill")}>
          {props.commit.id.substring(0, 7)}
          <a
            href="#"
            ref={setAnchor}
            onClick={async (evt) => {
              evt.preventDefault();
              await writeText(props.commit.id);
              setCopied(true);
            }}
          >
            <AiOutlineCopy />
          </a>
        </div>
        <div class={qs("boxAuto")}>
          {new Date(props.commit.time * 1000).toLocaleString()}
        </div>
      </div>
      <CommitAuthor author={props.commit.author} />
      <Show when={props.commit.parents.length}>
        <div>
          Parents:
          <For each={props.commit.parents}>
            {(id) => <CommitLink>{id}</CommitLink>}
          </For>
        </div>
      </Show>
    </div>
  );
};

const GRAVATAR_SIZE = 36;
const CommitAuthor = (props: { author: SignatureInfo }) => {
  const getGravatarUrl = () => {
    const hash = props.author.hash ?? "no_one";
    return `https://www.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=identicon`;
  };

  return (
    <div class={classes.commitAuthor}>
      <img
        src={getGravatarUrl()}
        width={GRAVATAR_SIZE}
        height={GRAVATAR_SIZE}
        alt="avatar"
      />
      <div class={qs("verticalFlex", "noOverflow")}>
        <div class={qs("textEllipsis")}>{props.author.name}</div>
        <div class={qs("textEllipsis")}>{props.author.email}</div>
      </div>
    </div>
  );
};

const CommitLink = (props: { children: string }) => {
  const commitLookup = readState(commitLookup$, {});

  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  useTippy(anchor, {
    hidden: true,
    props: {
      content: (
        <div>
          {commitLookup()[props.children]?.commit.summary?.substring(0, 40) ??
            ""}
        </div>
      ) as Element,
    },
  });

  return (
    <a
      ref={setAnchor}
      href="#"
      onClick={(evt) => {
        evt.preventDefault();
        setActiveCommit(props.children);
      }}
    >
      {" "}
      {props.children.substring(0, 7)}
    </a>
  );
};

interface File {
  id: string;
  path: string;
}

type FileChange =
  | { Added: File }
  | { Copied: [File, File] }
  | { Deleted: File }
  | { Renamed: [File, File] }
  | { Modified: [File, File] };

interface Delta {
  change: FileChange;
  binary: boolean;
}

interface CommitContents {
  insertions: number;
  deletions: number;
  deltas: Array<Delta>;
}

const commitChanges$ = activeCommit$.pipeState(
  withLatestFrom(repo_path$),
  switchMap(([id, path]) =>
    from(invoke<CommitContents>("get_commit", { path, id })).pipe(
      startWith(null)
    )
  )
);

const ActiveCommitChanges = () => {
  const changes = readState(commitChanges$, null);

  return (
    <Show when={changes()}>
      <div class={classes.commitChangeContainer}>
        <ChangeCount changes={changes()!} />
        <div class={qs("boxFill", "overflowVertical")}>
          <ul>
            <For each={changes()!.deltas}>
              {(delta) => <DeltaSummary delta={delta} />}
            </For>
          </ul>
        </div>
      </div>
    </Show>
  );
};

const ChangeCount = (props: { changes: CommitContents }) => {
  const getWidth = (value: number) => {
    const maxAmount = Math.max(
      100,
      props.changes.deletions,
      props.changes.insertions
    );
    return Math.round((1000 * value) / maxAmount) / 10 + "%";
  };

  return (
    <div class={qs("boxAuto", "horizontalFlex")}>
      <div class={qs("boxFill")}>Files: {props.changes.deltas.length}</div>
      <div class={qs("horizontalFlex", "centeredFlex")}>
        <span class={classes.deletions}>{props.changes.deletions}</span>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.deletion}
            style={{
              width: getWidth(props.changes.deletions),
            }}
          />
        </div>
        <div class={classes.infographicBg}>
          <div
            class={classes.infographicFg.insertion}
            style={{
              width: getWidth(props.changes.insertions),
            }}
          />
        </div>
        <span class={classes.insertions}>{props.changes.insertions}</span>
      </div>
    </div>
  );
};

function switchChangeType<T>(
  value: FileChange,
  options: Record<
    "Added" | "Copied" | "Deleted" | "Renamed" | "Modified",
    (content: File[]) => T
  >
): T;
function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue: T
): T;
function switchChangeType<T>(
  value: FileChange,
  options: Partial<
    Record<
      "Added" | "Copied" | "Deleted" | "Renamed" | "Modified",
      (content: File[]) => T
    >
  >,
  defaultValue?: T
): T {
  if ("Added" in value && options.Added) {
    return options.Added([value.Added]);
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
  return defaultValue!;
}

const DeltaSummary = (props: { delta: Delta }) => {
  const getFile = () =>
    switchChangeType(props.delta.change, {
      Added: ([v]) => v,
      Copied: ([, v]) => v,
      Deleted: ([v]) => v,
      Renamed: ([, v]) => v,
      Modified: ([, v]) => v,
    });
  const getIcon = () =>
    switchChangeType(props.delta.change, {
      Added: () => OcFileadded2,
      Copied: () => OcFilesymlinkfile2,
      Deleted: () => OcFileremoved2,
      Renamed: () => OcFilemoved2,
      Modified: () => OcFilediff2,
    });
  const getStyle = () =>
    switchChangeType(props.delta.change, {
      Added: () => positiveColor,
      Copied: () => neutralColor,
      Deleted: () => negativeColor,
      Renamed: () => neutralColor,
      Modified: () => changeColor,
    });

  const splitFile = () => {
    const path = getFile().path;
    const lastSlash = path.lastIndexOf("/");
    return lastSlash >= 0
      ? [path.slice(0, lastSlash), path.slice(lastSlash)]
      : ["", path];
  };

  const [anchor, setAnchor] = createSignal<HTMLDivElement>();

  useTippy(anchor, {
    hidden: true,
    props: {
      content: () => {
        const file = getFile();
        return file.path;
      },
      placement: "left",
    },
  });

  return () => {
    const [path, name] = splitFile();

    return (
      <li class={classes.changeLine} ref={setAnchor}>
        <span class={classes.changeIcon} style={{ color: getStyle() }}>
          <Dynamic component={getIcon()} />
        </span>
        <span
          class={classes.filePathDirectory}
          style={{
            "min-width": Math.min(3, path.length * 0.6) + "rem",
          }}
        >
          {path}
        </span>
        <span class={classes.filePathName}>{name}</span>
      </li>
    );
  };
};

const WorkingDirectory = () => {
  return <div class={qs("boxFill", "verticalFlex")}>Working dir</div>;
};
