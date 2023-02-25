import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { invoke } from "@tauri-apps/api/tauri";
import { concat, filter, from, map, merge, switchMap, tap } from "rxjs";
import { Show } from "solid-js";
import "./App.css";
import { Repo } from "./Repo";
import { openRepo, repo$ } from "./repoState";
import { readState } from "./rxState";

function App() {
  const repo = readState(repo$);

  return (
    <div class="container">
      <Show
        when={repo()}
        fallback={
          <button type="button" onClick={openRepo}>
            Open
          </button>
        }
      >
        <Repo />
      </Show>
    </div>
  );
}

export default App;
