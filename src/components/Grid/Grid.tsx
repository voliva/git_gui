import {
  VirtualContainer,
  VirtualItemProps,
  VirtualItemSize,
} from "@minht11/solid-virtual-container";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { children, For, JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import classes from "./Grid.module.css";

export const Grid = <T extends any>(props: {
  class?: string;
  items: T[];
  itemSize: VirtualItemSize;
  children: any;
}) => {
  const resolved = children(() => props.children);
  /**
   * This approach is flawed, it only works if the last column is auto-sized
   */
  const userWidths = new ReactiveWeakMap<ColumnProps, number>();
  const getColumnWidth = (column: ColumnProps) => {
    return userWidths.get(column) ?? column.width;
  };

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
              <Cell width={getColumnWidth(props)}>
                <Dynamic
                  component={props.children}
                  items={listProps.items}
                  item={listProps.item}
                  rowIndex={listProps.index}
                  width={getColumnWidth(props)}
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

        const onMouseDown = (evt: MouseEvent) => {
          const initialWidth = getColumnWidth(props) ?? 50;
          const initialMouseX = evt.screenX;
          // querying maxWidth + minWidth can be costly, and we can assume it won't change during drag, only calculate once.
          const maxWidth = props.maxWidth;
          const minWidth = props.minWidth;
          const onMouseMove = (evt: MouseEvent) => {
            const delta = evt.screenX - initialMouseX;
            const targetX = initialWidth + delta;
            const boundX = Math.min(
              Math.max(targetX, minWidth ?? 0),
              maxWidth ?? Number.POSITIVE_INFINITY
            );
            userWidths.set(props, boundX);
          };
          const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        };

        return (
          <Cell width={getColumnWidth(props)}>
            <span>{props.header}</span>
            <Show when={props.minWidth !== undefined}>
              <div class={classes.resizer} onMouseDown={onMouseDown}></div>
            </Show>
          </Cell>
        );
      }}
    </For>
  );

  let scrollTargetElement!: HTMLDivElement;
  return (
    <div
      classList={{
        [classes.gridContainer]: true,
        [props.class || ""]: Boolean(props.class),
      }}
      ref={scrollTargetElement}
    >
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
      width: props.width === undefined ? undefined : `${props.width}px`,
    }}
  >
    {props.children}
  </div>
);

export interface CellRendererProps<T> {
  items: readonly T[];
  item: T;
  rowIndex: number;
  width: number | undefined;
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
