const SHOPPING_WINDOW_NAME = "frontrow-shopping";

let shoppingWindowRef: Window | null = null;

function shoppingLauncherUrl(): string {
  if (typeof window === "undefined") return "/host/shopping";
  return `${window.location.origin}/host/shopping`;
}

/** Opens /host/shopping in a dedicated window; reuses and focuses if already open. */
export function openShoppingWindow(): Window | null {
  if (typeof window === "undefined") return null;

  if (shoppingWindowRef && !shoppingWindowRef.closed) {
    shoppingWindowRef.focus();
    return shoppingWindowRef;
  }

  shoppingWindowRef = window.open(
    shoppingLauncherUrl(),
    SHOPPING_WINDOW_NAME,
    "noopener,noreferrer",
  );
  return shoppingWindowRef;
}

/** Opens a store tab in the shopping window when possible. */
export function openStoreInShoppingWindow(storeUrl: string): Window | null {
  const shoppingWindow = openShoppingWindow();
  if (shoppingWindow) {
    return shoppingWindow.open(storeUrl, "_blank", "noopener,noreferrer");
  }
  return window.open(storeUrl, "_blank", "noopener,noreferrer");
}
