export const demoDelays = { import: 650, preview: 900, ai: 1100 } as const

// Cancellation settles the promise and removes both timer and event listener.
export function waitForDemo(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)
  return new Promise(resolve => {
    const finish = (completed: boolean) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      resolve(completed)
    }
    const cancel = () => finish(false)
    const timer = setTimeout(() => finish(true), milliseconds)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

export class DemoSimulation {
  private active: AbortController | null = null
  get pending() { return this.active !== null }
  begin(): AbortController | null {
    if (this.active) return null
    this.active = new AbortController()
    return this.active
  }
  current(operation: AbortController) { return this.active === operation && !operation.signal.aborted }
  finish(operation: AbortController) {
    if (this.active !== operation) return false
    this.active = null
    return true
  }
  cancel() { this.active?.abort(); this.active = null }
}
