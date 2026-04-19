/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cubicles backend host (default: 127.0.0.1) */
  readonly VITE_CUBICLES_HOST: string
  /** Cubicles backend port (default: 7799) */
  readonly VITE_CUBICLES_PORT: string
  /** Dev-only: absolute path to the cubicles-ts repo root */
  readonly VITE_CUBICLES_ROOT: string
  /** Dev-only: absolute path to the juice repo root */
  readonly VITE_JUICE_ROOT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
