import {
  DefaultedStateObservable,
  state,
  StateObservable,
} from "@react-rxjs/core";
import { from, startWith, switchMap } from "rxjs";
import { Accessor, createSignal, observable, onCleanup } from "solid-js";

export function readState<T>(state: DefaultedStateObservable<T>): Accessor<T>;
export function readState<T>(
  state: StateObservable<T>,
  defaultValue: T
): Accessor<T>;
export function readState<T>(
  state: StateObservable<T>
): Accessor<T | undefined>;
export function readState<T>(
  state: StateObservable<T> | DefaultedStateObservable<T>,
  defaultValue?: T
) {
  const [value, setValue] = createSignal(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    "getDefaultValue" in state ? state.getDefaultValue() : defaultValue!
  );

  const subscription = state.subscribe({
    next: setValue,
    error: (e) => {
      // TODO
      console.error("Error on readState");
      console.error(e);
    },
  });
  onCleanup(() => subscription.unsubscribe());

  return value;
}

export function readParametricState<T, A>(
  getState: (arg: A) => DefaultedStateObservable<T>,
  getter: () => A
): Accessor<T>;
export function readParametricState<T, A>(
  getState: (arg: A) => StateObservable<T>,
  getter: () => A,
  defaultValue: T
): Accessor<T>;
export function readParametricState<T, A>(
  getState: (arg: A) => StateObservable<T>,
  getter: () => A
): Accessor<T | undefined>;
export function readParametricState<T, A>(
  getState: (arg: A) => StateObservable<T> | DefaultedStateObservable<T>,
  getter: () => A,
  defaultValue?: T
) {
  const getDefaultValue = <T>(
    state: StateObservable<T> | DefaultedStateObservable<T>
  ) => ("getDefaultValue" in state ? state.getDefaultValue() : defaultValue);

  const arg$ = from(observable(getter));
  const obs$ = arg$.pipe(
    switchMap((arg) => {
      // console.log("change arg", arg);
      const state$ = getState(arg);
      if ("getDefaultValue" in state$) {
        return state$;
      }
      return state$.pipe(startWith(defaultValue));
    })
  );

  const sample = getState(getter());

  return readState(state(obs$), getDefaultValue(sample));
}

export const isNullish = <T>(v: T | null | undefined): v is null | undefined =>
  v == null;
export const isNotNullish = <T>(v: T | null | undefined): v is T => v != null;
