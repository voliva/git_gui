import { Show } from "solid-js";
import { Repo, openRepo, repo$ } from "./Repo";
import { readState } from "./rxState";

function App() {
  const repo = readState(repo$);

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
