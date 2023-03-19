import { qs } from "@/quickStyles";
import classNames from "classnames";
import { children, createSignal, For, JSXElement } from "solid-js";
import * as classes from "./FullTabs.css";

export const FullTabs = (props: {
  class?: string;
  children: any;
  onTabChange?: (tab: FullTabProps) => void;
}) => {
  const resolved = children(() => props.children);
  const firstTab = (resolved.toArray() as any as FullTabProps[]).find(
    (tab) => tab && !tab.disabled
  );
  const [activeView, setActiveView] = createSignal(firstTab);

  return (
    <div class={props.class}>
      <div class={qs("horizontalFlex", "noOverflow", "boxAuto")}>
        <For each={resolved.toArray()}>
          {(item) => {
            const tabProps = item as any as FullTabProps | null;
            if (!tabProps) return null;

            return (
              <div
                class={classNames(classes.fullTab, {
                  active: tabProps === activeView(),
                  disabled: tabProps.disabled,
                })}
                onMouseDown={(evt) => {
                  // disable getting focus if it's disabled
                  if (tabProps.disabled) evt.preventDefault();
                }}
                onClick={() => {
                  if (tabProps.disabled) return;
                  tabProps.onActive?.();
                  props.onTabChange?.(tabProps);
                  return setActiveView(tabProps);
                }}
              >
                {tabProps.header}
              </div>
            );
          }}
        </For>
      </div>
      {activeView()?.children}
    </div>
  );
};

export interface FullTabProps {
  header: string | JSXElement;
  children: JSXElement;
  onActive?: () => void;
  disabled?: boolean;
}

export const FullTab = (props: FullTabProps) => props as any;
