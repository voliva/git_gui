import {
  VirtualContainer,
  VirtualItemProps,
  VirtualItemSize,
} from "@minht11/solid-virtual-container";
import { children, For } from "solid-js";
import classes from "./Grid.module.css";

export const Grid = <T extends any>(props: {
  items: T[];
  itemSize: VirtualItemSize;
  children: any;
}) => {
  const resolved = children(() => props.children);

  const ListItem = (listProps: VirtualItemProps<T>) => {
    console.log("resolved", resolved.toArray());

    return (
      <div
        class={classes.itemContainer}
        // Required for items to switch places.
        style={{ ...listProps.style }}
        // Used for keyboard navigation and accessibility.
        tabIndex={listProps.tabIndex}
        role="listitem"
      >
        {listProps.index}
      </div>
    );
  };

  const getHeaders = () => (
    <For each={resolved.toArray()}>
      {(item) => {
        const props = item as any as ColumnProps | null;
        if (!props) return null;

        return <div>{props.header}</div>;
      }}
    </For>
  );

  let scrollTargetElement!: HTMLDivElement;
  return (
    <div class={classes.gridContainer}>
      <div class={classes.headerContainer}>{getHeaders()}</div>
      <div class={classes.scrollArea} ref={scrollTargetElement}>
        <VirtualContainer
          items={props.items}
          scrollTarget={scrollTargetElement}
          // Define size you wish your list items to take.
          itemSize={props.itemSize}
        >
          {ListItem}
        </VirtualContainer>
      </div>
    </div>
  );
};

export interface ColumnProps {
  header: string;
  children: any;
}

export const Column = (props: ColumnProps) => props as any;
