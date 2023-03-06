import { invoke } from "@tauri-apps/api";
import { firstValueFrom } from "rxjs";
import { createSignal } from "solid-js";
import { repo_path$ } from "./repoState";

export const RepoHeader = () => {
  const [isFetching, setIsFetching] = createSignal(false);

  return (
    <div>
      <button
        disabled={isFetching()}
        onClick={async () => {
          const path = await firstValueFrom(repo_path$);
          try {
            setIsFetching(true);
            await invoke("fetch", { path });
          } catch (ex) {
            console.error(ex);
          }
          setIsFetching(false);
        }}
      >
        Fetch
      </button>
    </div>
  );
};
