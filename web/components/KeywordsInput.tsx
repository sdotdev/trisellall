'use client'

import { useState } from 'react'

export default function KeywordsInput({
  name,
  label,
  placeholder = 'Type a keyword and press Enter',
  defaultValue = '',
}: {
  name: string
  label: string
  placeholder?: string
  defaultValue?: string
}) {
  const [tags, setTags] = useState<string[]>(
    defaultValue ? defaultValue.split(',').map(t => t.trim()).filter(Boolean) : []
  )
  const [input, setInput] = useState('')

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed.toLowerCase())) {
      setTags([...tags, trimmed])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag(input)
              }
              if (e.key === 'Backspace' && !input && tags.length > 0) {
                removeTag(tags[tags.length - 1])
              }
            }}
            onBlur={() => addTag(input)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none placeholder-zinc-400 dark:text-zinc-50 dark:placeholder-zinc-600"
          />
        </div>
      </div>
      <input type="hidden" name={name} value={tags.join(', ')} />
    </div>
  )
}
