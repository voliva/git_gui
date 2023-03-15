import {
  combineLatest,
  connect,
  defer,
  filter,
  finalize,
  map,
  Observable,
  scan,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs";
import { listen, Event } from "@tauri-apps/api/event";
import { v4 } from "uuid";
import { invoke } from "@tauri-apps/api";

export const listen$ = <T>(evt: string) =>
  new Observable<Event<T>>((obs) => {
    const unlisten = listen<T>(evt, (event) => obs.next(event));

    return async () => {
      (await unlisten)();
    };
  });

export const streamCommand$ = <T>(
  command: string,
  payload?: Record<string, unknown>
) =>
  defer(() => {
    const id = v4();
    const messages$ = new Subject<void>();
    const request$ = defer(() =>
      invoke<number>(command, { ...payload, correlationId: id })
    );

    return listen$<T>(`${command}-stream-${id}`).pipe(
      tap(() => messages$.next()),
      map(({ payload }) => payload),
      takeUntil(
        // Stop when we've received all messages
        combineLatest([
          messages$.pipe(
            scan((v) => v + 1, 0),
            startWith(0)
          ),
          request$,
        ]).pipe(filter(([v, messages]) => v === messages))
      ),
      finalize(() => messages$.complete())
    );
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
