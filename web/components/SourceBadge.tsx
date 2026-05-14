const sourceColors: Record<string, string> = {
  vinted: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  gumtree: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  both: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const sourceLabels: Record<string, string> = {
  vinted: 'Vinted',
  gumtree: 'Gumtree',
  both: 'Vinted + Gumtree',
}

export function sourceLabel(source: string): string {
  return sourceLabels[source] ?? source
}

export default function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[source] ?? ''}`}>
      {sourceLabels[source] ?? source}
    </span>
  )
}
