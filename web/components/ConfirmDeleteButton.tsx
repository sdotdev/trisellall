'use client'

export default function ConfirmDeleteButton({ action, label = 'Delete' }: { action: () => void; label?: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('Are you sure you want to delete this? This cannot be undone.')) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {label}
      </button>
    </form>
  )
}
