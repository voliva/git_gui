import { Observable, Subscription, type ObservableInput, from } from "rxjs";
import { onDestroy } from "svelte";

export const isNullish = <T>(v: T | null | undefined): v is null | undefined =>
  v == null;
export const isNotNullish = <T>(v: T | null | undefined): v is T => v != null;

const empty = Symbol("empty");
export function losslessExhaustMap<T, R>(
  mapFn: (value: T) => ObservableInput<R>
) {
  return (source$: Observable<T>) =>
    new Observable<R>((obs) => {
      let innerSub: Subscription | null = null;
      let missed: T | typeof empty = empty;
      let outerComplete = false;

      const subscribeInner = (value: T) => {
        innerSub = from(mapFn(value)).subscribe({
          next: (result) => obs.next(result),
          error: (error) => obs.error(error),
          complete: () => {
            innerSub = null;
            if (missed !== empty) {
              const tmp = missed;
              missed = empty;
              subscribeInner(tmp);
            } else if (outerComplete) {
              obs.complete();
            }
          },
        });
      };

      const outerSub = source$.subscribe({
        next: (value) => {
          if (!innerSub) {
            subscribeInner(value);
          } else {
            missed = value;
          }
        },
        error: (e) => obs.error(e),
        complete: () => {
          if (!innerSub) {
            obs.complete();
          } else {
            outerComplete = true;
          }
        },
      });

      return () => {
        innerSub?.unsubscribe();
        outerSub.unsubscribe();
      };
    });
}

export function losslessThrottle<T>(timeout: number) {
  return (source$: Observable<T>) =>
    new Observable<T>((obs) => {
      let throttle: NodeJS.Timeout | null = null;
      let missed: T | typeof empty = empty;

      const emit = (value: T) => {
        throttle = setTimeout(() => {
          throttle = null;

          if (missed !== empty) {
            const tmp = missed;
            missed = empty;
            emit(tmp);
          }
        }, timeout);
        obs.next(value);
      };

      const sub = source$.subscribe({
        next: (v) => {
          if (!throttle) {
            emit(v);
          } else {
            missed = v;
          }
        },
        error: (e) => obs.error(e),
        complete: () => obs.complete,
      });

      return () => {
        sub.unsubscribe();
        if (throttle !== null) {
          clearTimeout(throttle);
        }
      };
    });
}

export function componentEffect(subscription: Subscription) {
  onDestroy(() => subscription.unsubscribe());
}
