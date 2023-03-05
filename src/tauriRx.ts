import { Observable } from "rxjs";
import { listen, Event } from "@tauri-apps/api/event";

export const listen$ = <T>(evt: string) =>
  new Observable<Event<T>>((obs) => {
    const unlisten = listen<T>(evt, (event) => obs.next(event));

    return async () => {
      (await unlisten)();
    };
  });
