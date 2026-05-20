export {};

declare global {
  interface Window {
    cv: {
      imread: (canvasOrImageHtmlElement: HTMLElement | string) => unknown;
    };
  }
}
