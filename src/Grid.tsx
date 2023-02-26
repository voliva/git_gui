import {
  VirtualContainer,
  VirtualItemProps,
  VirtualItemSize,
} from "@minht11/solid-virtual-container";
import { children, For, JSXElement } from "solid-js";
import { Dynamic } from "solid-js/web";
import classes from "./Grid.module.css";

export const Grid = <T extends any>(props: {
  items: T[];
  itemSize: VirtualItemSize;
  children: any;
}) => {
  const resolved = children(() => props.children);

  const ListItem = (listProps: VirtualItemProps<T>) => {
    return (
      <div
        class={classes.itemContainer}
        // Required for items to switch places.
        style={{ ...listProps.style }}
        // Used for keyboard navigation and accessibility.
        tabIndex={listProps.tabIndex}
        role="listitem"
      >
        <For each={resolved.toArray()}>
          {(item, columnIndex) => {
            const props = item as any as ColumnProps | null;
            if (!props) return null;

            return (
              <Cell width={props.width}>
                <Dynamic
                  component={props.children}
                  items={listProps.items}
                  item={listProps.item}
                  rowIndex={listProps.index}
                  width={props.width ?? null}
                  columnIndex={columnIndex()}
                  columnProps={props}
                />
              </Cell>
            );
          }}
        </For>
      </div>
    );
  };

  const getHeaders = () => (
    <For each={resolved.toArray()}>
      {(item) => {
        const props = item as any as ColumnProps | null;
        if (!props) return null;

        return <Cell width={props.width}>{props.header}</Cell>;
      }}
    </For>
  );

  let scrollTargetElement!: HTMLDivElement;
  return (
    <div class={classes.gridContainer} ref={scrollTargetElement}>
      <div class={classes.headerContainer}>{getHeaders()}</div>
      <VirtualContainer
        className={classes.virtualContainer}
        items={props.items}
        scrollTarget={scrollTargetElement}
        // Define size you wish your list items to take.
        itemSize={props.itemSize}
      >
        {ListItem}
      </VirtualContainer>
    </div>
  );
};

const Cell = (props: { width?: number; children: JSXElement }) => (
  <div
    classList={{
      [classes.cellAuto]: props.width === undefined,
      [classes.cellFixed]: props.width !== undefined,
    }}
    style={{
      "flex-basis": props.width === undefined ? undefined : `${props.width}px`,
    }}
  >
    {props.children}
  </div>
);

export interface CellRendererProps<T> {
  items: readonly T[];
  item: T;
  rowIndex: number;
  width: number | null;
  columnIndex: number;
  columnProps: ColumnProps;
}

export interface ColumnProps {
  header?: string;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  children: (props: CellRendererProps<any>) => JSXElement;
}

export const Column = (props: ColumnProps) => props as any;
