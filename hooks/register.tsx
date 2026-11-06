import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Snap } from '../types'

const PANE = 'usage-meter'
const snap = atom({ plugin: 'usage-meter', key: 'snap' } as const, null, {
  shape: 'snap-1',
})
const warned = new Set<string>()
const month = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date())

// Adds this session's cost growth to a per-month total kept across sessions.
const addMonth = async ($: any, usd?: number) => {
  if (usd === undefined) return undefined
  const ym = month()
  const rec = ((await $.store.get('month')) ?? {}) as { ym?: string; total?: number; last?: number }
  let total = rec.ym === ym ? rec.total ?? 0 : 0
  const last = rec.ym === ym ? rec.last : undefined
  const delta = last === undefined ? 0 : usd >= last ? usd - last : usd
  total += delta
  await $.store.set('month', { ym, total, last: usd })
  return total
}

const LABEL: Record<string, string> = {
  five_hour: '5 小時視窗（5-hour）',
  seven_day: '7 日視窗（7-day）',
  spend_limit: '花費上限（Spend limit）',
}

const bar = (p: number) => {
  const n = Math.max(0, Math.min(20, Math.round((p / 100) * 20)))
  return '█'.repeat(n) + '░'.repeat(20 - n)
}

const when = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return ' 重置 ' + d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'usage', description: '開啟用量儀表板（Usage meter）窗格' })
    void $.ui.open({ id: PANE, title: '用量（Usage）' })
    return next(e)
  })

  on('command.run', { command: 'usage' }, async $ => {
    await $.ui.open({ id: PANE, title: '用量（Usage）' })
    return { text: '已開啟用量窗格。' }
  })

  on('session.measure', async ($, e, next) => {
    const monthUsd = await addMonth($, e.cost?.usd)
    await update($, snap, () => ({
      limits: e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
      ctxPercent: e.context.percent,
      ctxTokens: e.context.tokens,
      ctxWindow: e.context.window,
      usd: e.cost?.usd,
      monthUsd,
      month: month(),
      at: Date.now(),
    }))
    for (const l of e.rateLimits) {
      for (const t of l.kind === 'seven_day' ? [90, 80, 70] : [90, 80]) {
        const key = l.kind + t
        if (l.percentUsed >= t && !warned.has(key)) {
          warned.add(key)
          void $.ui.toast(`${LABEL[l.kind] ?? l.kind} 已用 ${l.percentUsed}%`)
          break
        }
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, snap)
    if (!s) return <Text dimColor>等待第一次用量資料…（送出一則訊息後更新）</Text>
    return (
      <Box flexDirection="column">
        <Text bold>速率限制（Rate limits）</Text>
        {s.limits.length === 0 && <Text dimColor>此帳號無訂閱方案資料</Text>}
        {s.limits.map(l => (
          <Box flexDirection="column">
            <Text>{LABEL[l.kind] ?? l.kind}：{l.percentUsed}%</Text>
            <Text>{bar(l.percentUsed)}{when(l.resetsAt)}</Text>
          </Box>
        ))}
        <Text bold>內容視窗（Context）</Text>
        <Text>{s.ctxPercent !== undefined ? `${s.ctxPercent}%` : '—'}　{s.ctxTokens ?? '—'} / {s.ctxWindow ?? '—'} tokens</Text>
        {s.ctxPercent !== undefined && <Text>{bar(s.ctxPercent)}</Text>}
        <Text bold>花費（Cost）</Text>
        <Text>本次：{s.usd !== undefined ? `US$${s.usd.toFixed(2)}` : '—'}</Text>
        <Text>本月（{s.month}）累計：{s.monthUsd !== undefined ? `US$${s.monthUsd.toFixed(2)}` : '—'}</Text>
        <Text dimColor>更新於 {new Date(s.at).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}</Text>
      </Box>
    )
  })
}
