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
import { AiOutlineCopy } from "solid-icons/ai";
import { createSignal, For, Show } from "solid-js";
import { useTippy } from "solid-tippy";
import * as classes from "./DetailPanel.css";
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

const DeltaSummary = (props: { delta: Delta }) => {
  const getFile = () => {
    const delta = props.delta;
    if ("Added" in delta.change) {
      return delta.change.Added;
    }
    if ("Copied" in delta.change) {
      return delta.change.Copied[1];
    }
    if ("Deleted" in delta.change) {
      return delta.change.Deleted;
    }
    if ("Renamed" in delta.change) {
      return delta.change.Renamed[1];
    }
    // if ('Modified' in delta.change) {
    return delta.change.Modified[1];
    // }
  };
  const splitFile = () => {
    const path = getFile().path;
    const lastSlash = path.lastIndexOf("/");
    return lastSlash >= 0
      ? [path.slice(0, lastSlash), path.slice(lastSlash)]
      : ["", path];
  };

  return () => {
    const [path, name] = splitFile();

    return (
      <li class={qs("horizontalFlex", "noOverflow")}>
        <span
          class={classes.filePathDirectory}
          style={{
            "min-width": Math.min(3, path.length) + "rem",
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
