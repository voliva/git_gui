import { readState } from "@/rxState";
import { Show } from "solid-js";
import { openRepo, Repo, repo_path$ } from "./Repo";

function App() {
  const repo = readState(repo_path$);

  return (
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
  );
}

export default App;
