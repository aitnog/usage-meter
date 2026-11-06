export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snap = {
  limits: Limit[]
  ctxPercent?: number
  ctxTokens?: number
  ctxWindow?: number
  usd?: number
  monthUsd?: number
  month?: string
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': { snap: Shaped<Snap | null> }
  }
}
