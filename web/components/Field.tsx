interface FieldProps {
  label: string
  name: string
  placeholder?: string
  defaultValue?: string | number
  required?: boolean
  type?: string
  'data-tour'?: string
}

export default function Field({
  label, name, placeholder, defaultValue, required, type = 'text', 'data-tour': dataTour,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        data-tour={dataTour}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
      />
    </div>
  )
}
