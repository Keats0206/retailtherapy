interface DocumentPictureInPictureAPI {
  readonly window: Window | null;
  requestWindow(options?: {
    width?: number;
    height?: number;
    preferInitialWindowPlacement?: boolean;
    disallowReturnToOpener?: boolean;
  }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  }
}

export {};
