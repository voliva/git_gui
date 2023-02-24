import { DefaultedStateObservable, StateObservable } from "@react-rxjs/core";
import { Accessor, createSignal, onCleanup } from "solid-js";

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
