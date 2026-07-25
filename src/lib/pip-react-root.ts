import React, { type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TooltipProvider } from "@/components/ui/tooltip";

const roots = new WeakMap<Window, Root>();
const styledWindows = new WeakSet<Window>();

/** Copy stylesheets from the opener so Tailwind classes work in the PiP window. */
export function injectPipStyles(pipWindow: Window) {
  if (styledWindows.has(pipWindow)) return;
  if (pipWindow.document.head.dataset.pipStyles === "true") {
    styledWindows.add(pipWindow);
    return;
  }

  styledWindows.add(pipWindow);
  pipWindow.document.head.dataset.pipStyles = "true";

  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    pipWindow.document.head.appendChild(node.cloneNode(true));
  }

  pipWindow.document.documentElement.className = document.documentElement.className;
  pipWindow.document.body.className =
    "bg-background text-foreground antialiased pip-studio m-0 overflow-hidden";
}

export function mountPipApp(pipWindow: Window, element: ReactElement) {
  injectPipStyles(pipWindow);

  let root = roots.get(pipWindow);
  if (!root) {
    root = createRoot(pipWindow.document.body);
    roots.set(pipWindow, root);
  }

  root.render(
    React.createElement(TooltipProvider, null, element),
  );
}

export function unmountPipApp(pipWindow: Window) {
  const root = roots.get(pipWindow);
  if (!root) return;

  root.unmount();
  roots.delete(pipWindow);
  styledWindows.delete(pipWindow);
}

export function closePipWindow(pipWindow: Window | null | undefined) {
  pipWindow?.close();
}
