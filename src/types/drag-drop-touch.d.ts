declare module '@dragdroptouch/drag-drop-touch' {
  export function enableDragDropTouch(
    dragRoot?: Document | HTMLElement,
    dropRoot?: Document | HTMLElement,
    options?: {
      allowDragScroll?: boolean;
      contextMenuDelayMS?: number;
      dragImageOpacity?: number;
      dragScrollPercentage?: number;
      dragScrollSpeed?: number;
      dragThresholdPixels?: number;
      isPressHoldMode?: boolean;
      forceListen?: boolean;
      pressHoldDelayMS?: number;
      pressHoldMargin?: number;
      pressHoldThresholdPixels?: number;
    }
  ): void;
}
