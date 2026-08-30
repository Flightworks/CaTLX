import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, type RulesTestEnvironment, type RulesTestContext } from '@firebase/rules-unit-testing';

export const PROJECT_ID = 'demo-catlx';

export async function createRulesTestEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
}

export async function seedUser(
  env: RulesTestEnvironment,
  uid: string,
  role: string,
  status: 'active' | 'pending' | 'disabled' = 'active',
): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('users').doc(uid).set({
      email: `${uid}@example.test`,
      displayName: uid,
      role,
      status,
    });
  });
}

export async function seedDocument(
  env: RulesTestEnvironment,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length % 2 !== 0) throw new Error(`Expected document path: ${path}`);
    let ref = context.firestore().collection(segments[0]).doc(segments[1]);
    for (let index = 2; index < segments.length; index += 2) {
      ref = ref.collection(segments[index]).doc(segments[index + 1]);
    }
    await ref.set(data);
  });
}

export function authenticated(env: RulesTestEnvironment, uid: string): RulesTestContext {
  return env.authenticatedContext(uid, { email: `${uid}@example.test` });
}
