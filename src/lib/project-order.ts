import { isProjectId } from './project-validation'

export interface ProjectOrderState {
  savedOrder: string[]
  draftOrder: string[]
}

type OrderAction =
  | { type: 'move'; id: string; direction: -1 | 1; blocked: boolean }
  | { type: 'drop'; id: string; targetId: string; blocked: boolean }
  | { type: 'reset'; ids: string[] }
  | { type: 'saved'; ids: string[] }
  | { type: 'sync'; ids: string[] }

export type ProjectOrderResult =
  | { success: true; orderedIds: string[] }
  | { success: false; message: string; stale?: boolean }

export function sameProjectOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index])
}

export function createProjectOrder(ids: readonly string[]): ProjectOrderState {
  return { savedOrder: [...ids], draftOrder: [...ids] }
}

export function projectOrderControls(state: ProjectOrderState, query: string, pending: boolean, currentOrder = state.savedOrder) {
  const dirty = !sameProjectOrder(state.savedOrder, state.draftOrder)
  const stale = !sameProjectOrder(state.savedOrder, currentOrder)
  const searching = Boolean(query.trim())
  return {
    dirty, stale, searching,
    reorderDisabled: searching || pending || stale,
    crudDisabled: dirty || pending || stale,
    saveDisabled: !dirty || searching || pending || stale,
    resetDisabled: !dirty || searching || pending,
  }
}

export function projectOrderReducer(state: ProjectOrderState, action: OrderAction): ProjectOrderState {
  if (action.type === 'sync') {
    // A refresh must not silently replace the baseline of an unsaved draft.
    return sameProjectOrder(state.savedOrder, state.draftOrder) ? createProjectOrder(action.ids) : state
  }
  if (action.type === 'reset' || action.type === 'saved') return createProjectOrder(action.ids)
  if (action.blocked) return state
  const from = state.draftOrder.indexOf(action.id)
  const to = action.type === 'move' ? from + action.direction : state.draftOrder.indexOf(action.targetId)
  if (from < 0 || to < 0 || to >= state.draftOrder.length || from === to) return state
  const draftOrder = [...state.draftOrder]
  draftOrder.splice(to, 0, draftOrder.splice(from, 1)[0]!)
  return { savedOrder: state.savedOrder, draftOrder }
}

export function projectOrderPayload(state: ProjectOrderState) {
  // Never use search results or display positions as the persistence payload.
  return { orderedIds: [...state.draftOrder], expectedOrder: [...state.savedOrder] }
}

export function validateProjectOrder(orderedIds: unknown, expectedOrder: unknown):
  | { success: true; orderedIds: string[]; expectedOrder: string[] }
  | { success: false; message: string } {
  function ids(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > 10_000 || !Array.from(value).every(isProjectId)) return null
    const normalized = value.map((id: string) => id.toLowerCase())
    return new Set(normalized).size === normalized.length ? normalized : null
  }
  const ordered = ids(orderedIds)
  const expected = ids(expectedOrder)
  const expectedIds = new Set(expected ?? [])
  if (!ordered || !expected || ordered.length !== expected.length || ordered.some((id) => !expectedIds.has(id))) {
    return { success: false, message: 'Invalid project order. Refresh the list and try again.' }
  }
  // Database membership, complete-set equality and staleness are checked by
  // the RPC under its lock; a separate read here would introduce a race.
  return { success: true, orderedIds: ordered, expectedOrder: expected }
}
