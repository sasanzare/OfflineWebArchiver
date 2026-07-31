declare global {
  interface Window {
    phase02Spike: import("../shared/contracts.js").PreloadApi;
  }
}

export {};

