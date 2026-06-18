export function formatKRW(amount: number): string {
  if (amount === 0) return '0원'
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원'
}

export function formatKRWCompact(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`
  }
  if (Math.abs(amount) >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만원`
  }
  return formatKRW(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function parseKRW(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
}
