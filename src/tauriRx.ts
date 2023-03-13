import {
  connect,
  Observable,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { listen, Event } from "@tauri-apps/api/event";

export const listen$ = <T>(evt: string) =>
  new Observable<Event<T>>((obs) => {
    const unlisten = listen<T>(evt, (event) => obs.next(event));

    return async () => {
      (await unlisten)();
    };
  });

export const waitWithLatestFrom =
  <T, O>(obs$: Observable<O>) =>
  (source$: Observable<T>) =>
    obs$.pipe(
      connect((shared$) =>
        shared$.pipe(
          take(1),
          switchMap((v) =>
            source$.pipe(withLatestFrom(shared$.pipe(startWith(v))))
          )
        )
      )
    );
