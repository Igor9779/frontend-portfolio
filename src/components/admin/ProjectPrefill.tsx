'use client'

import { useRef } from 'react'
import type { ProjectFormPrefill } from '../../types/project-form'
import type { AiProjectSuggestions } from '../../types/ai-autofill'
import { GithubImport } from './GithubImport'
import { AiAutofill } from './AiAutofill'

// Production orchestration stays outside the shared form/demo import graph.
export function ProjectPrefill({ disabled, repositoryUrl, onApply, onApplySuggestions, onPendingChange }: {
  disabled: boolean
  repositoryUrl: string
  onApply: (fields: ProjectFormPrefill) => void
  onApplySuggestions: (suggestions: AiProjectSuggestions, expectedRepository: string) => boolean
  onPendingChange: (pending: boolean) => void
}) {
  const active = useRef(false)
  function onStart() {
    if (active.current || disabled) return false
    active.current = true
    return true
  }
  function pendingChanged(pending: boolean) {
    if (!pending) active.current = false
    onPendingChange(pending)
  }
  return <>
    <GithubImport disabled={disabled} onStart={onStart} onApply={onApply} onPendingChange={pendingChanged} />
    <AiAutofill repositoryUrl={repositoryUrl} disabled={disabled} onStart={onStart} onApply={onApplySuggestions} onPendingChange={pendingChanged} />
  </>
}
