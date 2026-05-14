'use client'

export default function ConfirmForm({
  action,
  message = 'Are you sure?',
  children,
}: {
  action: (formData: FormData) => void
  message?: string
  children: React.ReactNode
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault()
        }
      }}
    >
      {children}
    </form>
  )
}
