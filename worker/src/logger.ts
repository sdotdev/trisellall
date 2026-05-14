function ts(): string {
  return new Date().toISOString()
}

export function log(tag: string, msg: string, meta?: Record<string, unknown>): void {
  if (meta) console.log(`${ts()} [${tag}] ${msg}`, meta)
  else console.log(`${ts()} [${tag}] ${msg}`)
}

export function warn(tag: string, msg: string, meta?: Record<string, unknown>): void {
  if (meta) console.warn(`${ts()} [${tag}] WARN ${msg}`, meta)
  else console.warn(`${ts()} [${tag}] WARN ${msg}`)
}

export function error(tag: string, msg: string, meta?: Record<string, unknown>): void {
  if (meta) console.error(`${ts()} [${tag}] ERROR ${msg}`, meta)
  else console.error(`${ts()} [${tag}] ERROR ${msg}`)
}
