declare global {
  interface MediaDevices {
    setCaptureHandleConfig(config: { handle?: string }): Promise<void>;
  }

  interface MediaStreamTrack {
    getCaptureHandle(): Promise<{ handle?: string } | null>;
    addEventListener(
      type: "capturehandlechange",
      listener: () => void,
    ): void;
    removeEventListener(
      type: "capturehandlechange",
      listener: () => void,
    ): void;
  }
}

declare module "react" {
  // Generic parameter required to match React's IframeHTMLAttributes signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- type param mirrors React
  interface IframeHTMLAttributes<T> {
    credentialless?: boolean;
  }
}

export {};
