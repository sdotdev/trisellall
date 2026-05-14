export default function WatchesLoading() {
  return (
    <div className="flex flex-col gap-6 p-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  )
}
