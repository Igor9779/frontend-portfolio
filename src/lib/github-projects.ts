import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export async function findGithubProject(supabase: SupabaseClient<Database>, repository: string) {
  // ILIKE matches legacy mixed-case values. Escape its wildcard characters so
  // a repository containing underscores cannot match a different repository.
  const pattern = repository.replace(/[\\%_]/g, '\\$&')
  const { data, error } = await supabase.from('projects').select('id')
    .ilike('github_repo', pattern).limit(1).abortSignal(AbortSignal.timeout(10_000)).maybeSingle()
  return { exists: Boolean(data), error: Boolean(error) }
}
