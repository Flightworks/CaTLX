import { createClient } from '@supabase/supabase-js';
import type { WorkspaceData } from '../types';

export type Deployment = 'preprod' | 'production';

type WorkspaceRow = {
  singleton: boolean;
  environment: Deployment;
  payload: WorkspaceData;
  revision: number;
  write_id: string | null;
};

type Database = {
  public: {
    Tables: {
      catlx_workspace: {
        Row: WorkspaceRow;
        Insert: never;
        Update: Partial<Pick<WorkspaceRow, 'payload' | 'revision' | 'write_id'>>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

const url = import.meta.env.VITE_SUPABASE_URL;
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const environment = import.meta.env.VITE_CATLX_ENV as Deployment | undefined;

export const cloudConfig = import.meta.env.MODE !== 'github-pages' && url && publicKey && environment ? {
  environment,
  offlineScope: `${url}|${environment}`,
  storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
  siteUrl: import.meta.env.VITE_CATLX_SITE_URL,
  client: createClient<Database>(url, publicKey, {
    auth: { flowType: 'pkce' },
  }),
} : null;

export type CloudConfig = NonNullable<typeof cloudConfig>;

export async function loadWorkspace({ client, environment }: CloudConfig, signal?: AbortSignal) {
  const query = client.from('catlx_workspace')
    .select('payload, revision')
    .eq('environment', environment);

  return (signal ? query.abortSignal(signal) : query).maybeSingle();
}

export type LoadedWorkspace = Pick<WorkspaceRow, 'payload' | 'revision'>;

export async function saveWorkspace(
  { client, environment }: CloudConfig,
  payload: WorkspaceData,
  revision: number,
  writeId: string,
  signal: AbortSignal,
): Promise<'saved' | 'conflict' | 'denied'> {
  const query = () => client.from('catlx_workspace').select('revision, write_id').eq('environment', environment);

  const { data, error } = await client.from('catlx_workspace')
    .update({ payload, revision: revision + 1, write_id: writeId })
    .eq('environment', environment)
    .eq('revision', revision)
    .select('revision')
    .abortSignal(signal)
    .maybeSingle();

  if (error) {
    if (error.code === '42501') return 'denied';
    throw error;
  }
  if (data) return 'saved';

  const { data: latest, error: readError } = await query().abortSignal(signal).maybeSingle();
  if (readError) throw readError;
  if (!latest) return 'denied';

  // The previous request may have reached Supabase even if we lost its response.
  return latest.write_id === writeId && latest.revision === revision + 1 ? 'saved' : 'conflict';
}
