import { qs } from "@/quickStyles";
import classNames from "classnames";
import { children, createSignal, For, JSXElement } from "solid-js";
import * as classes from "./FullTabs.css";

export const FullTabs = (props: { class?: string; children: any }) => {
  const resolved = children(() => props.children);
  const firstTab = (resolved.toArray() as any as FullTabProps[]).find(
    (tab) => tab && !tab.disabled
  );
  const [activeView, setActiveView] = createSignal(firstTab?.children);

  return (
    <div class={props.class}>
      <div class={qs("horizontalFlex", "noOverflow")}>
        <For each={resolved.toArray()}>
          {(item) => {
            const props = item as any as FullTabProps | null;
            if (!props) return null;

            return (
              <div
                class={classNames(classes.fullTab)}
                onClick={() => setActiveView(props.children)}
              >
                {props.header}
              </div>
            );
          }}
        </For>
      </div>
      {activeView}
    </div>
  );
};

export interface FullTabProps {
  header: string | JSXElement;
  children: JSXElement;
  disabled?: boolean;
}

export const FullTab = (props: FullTabProps) => props as any;
