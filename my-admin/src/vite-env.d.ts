/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true": Nachrichten über die Edge Functions im Hintergrund senden. */
  readonly VITE_DIRECT_MESSAGING?: string;
}
