import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white px-10 py-12 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Sign-in failed</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Something went wrong during authentication.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </Link>
      </div>
    </div>
  )
}
