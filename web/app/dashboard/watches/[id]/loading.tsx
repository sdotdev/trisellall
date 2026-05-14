export default function WatchDetailLoading() {
  return (
    <div className="flex flex-col gap-8 p-8 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
