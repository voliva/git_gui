import {
  VirtualContainer,
  VirtualItemProps,
  VirtualItemSize,
} from "@minht11/solid-virtual-container";
import { ReactiveWeakMap } from "@solid-primitives/map";
import classNames from "classnames";
import { children, createSignal, For, JSX, JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import * as classes from "./Grid.css";

export const Grid = <T,>(props: {
  class?: string;
  items: T[];
  itemSize: VirtualItemSize;
  children: JSX.Element;
  itemClass?: (item: T) => string | null | undefined;
  onRowClick?: (item: T) => void;
  onKeyDown?: JSX.EventHandlerUnion<HTMLDivElement, KeyboardEvent>;
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
    const [isHovering, setIsHovering] = createSignal(false);

    return (
      <div
        class={classNames(
          classes.itemContainer,
          props.itemClass?.(listProps.item)
        )}
        // Required for items to switch places.
        style={{ ...listProps.style }}
        // Used for keyboard navigation and accessibility.
        tabIndex={listProps.tabIndex}
        role="listitem"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => props.onRowClick?.(listProps.item)}
      >
        <For each={resolved.toArray()}>
          {(item, columnIndex) => {
            const props = item as unknown as ColumnProps | null;
            if (!props) return null;

            return (
              <Cell width={getColumnWidth(props)} class={props.itemClass}>
                <Dynamic
                  component={props.children}
                  items={listProps.items}
                  item={listProps.item}
                  rowIndex={listProps.index}
                  width={getColumnWidth(props)}
                  columnIndex={columnIndex()}
                  columnProps={props}
                  isHovering={isHovering()}
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
        const props = item as unknown as ColumnProps | null;
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
          <Cell width={getColumnWidth(props)} class={props.headerClass}>
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
      onKeyDown={props.onKeyDown}
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

const Cell = (props: {
  width?: number;
  class?: string;
  children: JSXElement;
}) => (
  <div
    class={props.class}
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
  isHovering: boolean;
}

export interface ColumnProps<T = unknown> {
  header?: string;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  itemClass?: string;
  headerClass?: string;
  children: (props: CellRendererProps<T>) => JSXElement;
}

export const Column = <T,>(props: ColumnProps<T>) =>
  props as unknown as JSX.Element;
