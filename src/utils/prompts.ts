import inquirer from 'inquirer';
import type { Identity } from '../types/index.js';
import { listExistingKeys, generateKey } from '../services/ssh.js';
import { section, info, withSpinner } from './ui.js';

export type SshKeyChoice = { kind: 'generate'; path: string } | { kind: 'existing'; path: string };

export async function promptSshKeySetup(identityId: string): Promise<SshKeyChoice> {
  section('SSH key');
  info('This key is used to authenticate with GitHub when using this identity.');
  info('You can generate a new key or pick one you already have in ~/.ssh');
  console.log('');

  const { action } = await inquirer.prompt<{ action: 'generate' | 'existing' }>({
    type: 'list',
    name: 'action',
    message: 'How do you want to set up the SSH key?',
    choices: [
      { name: 'Generate a new SSH key (recommended for a new account)', value: 'generate' },
      { name: 'Use an existing SSH key from ~/.ssh', value: 'existing' },
    ],
  });

  if (action === 'generate') {
    const path = await withSpinner(
      'Generating new Ed25519 key',
      () => generateKey(identityId),
      { successMessage: 'SSH key generated', failureMessage: 'Failed to generate SSH key' }
    );
    return { kind: 'generate', path };
  }

  const existing = await withSpinner(
    'Looking for existing keys in ~/.ssh',
    async () => {
      const keys = await listExistingKeys();
      if (keys.length === 0) {
        throw new Error('No SSH keys found in ~/.ssh. Generate one first or choose "Generate a new SSH key".');
      }
      return keys;
    },
    { successMessage: 'Found SSH keys', failureMessage: 'No keys found or could not read ~/.ssh' }
  );

  console.log('');
  const { path } = await inquirer.prompt<{ path: string }>({
    type: 'list',
    name: 'path',
    message: 'Which SSH key should this identity use?',
    choices: existing.map((p) => ({ name: p, value: p })),
  });

  return { kind: 'existing', path };
}

export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  const { ok } = await inquirer.prompt<{ ok: boolean }>({
    type: 'confirm',
    name: 'ok',
    message,
    default: defaultValue,
  });
  return ok;
}

export async function promptIdentityFields(existing?: Partial<Identity>): Promise<{
  id: string;
  name: string;
  email: string;
  sshHost: string;
}> {
  section('Identity details');
  info('These show up in your git commits (e.g. author name and email).');
  info('Use an ID like "personal" or "work" to tell identities apart.');
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Identity ID (e.g. personal, work):',
      default: existing?.id,
      validate: (v: string) =>
        /^[a-zA-Z0-9_-]+$/.test(v) ? true : 'Use only letters, numbers, underscore, hyphen',
    },
    {
      type: 'input',
      name: 'name',
      message: 'Full name (for git commits):',
      default: existing?.name,
      validate: (v: string) => (v?.trim() ? true : 'Name is required'),
    },
    {
      type: 'input',
      name: 'email',
      message: 'Email (for git commits):',
      default: existing?.email,
      validate: (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : 'Enter a valid email'),
    },
    {
      type: 'input',
      name: 'sshHost',
      message: 'SSH host alias (used in clone URLs, e.g. github-personal):',
      default: existing?.sshHost ?? ((ans: { id?: string }) => (ans?.id ? `github-${ans.id}` : undefined)),
      validate: (v: string) => (v?.trim() ? true : 'SSH host alias is required'),
    },
  ]);
  return answers as { id: string; name: string; email: string; sshHost: string };
}

export async function promptUpdateSshConfig(): Promise<boolean> {
  return promptConfirm(
    'Update ~/.ssh/config with Host entries for this identity? (needed for git clone/push)',
    true
  );
}

export async function promptSelectIdentity(identities: Identity[]): Promise<Identity> {
  const { id } = await inquirer.prompt<{ id: string }>({
    type: 'list',
    name: 'id',
    message: 'Select identity (profile) for this clone:',
    choices: identities.map((i) => ({
      name: `${i.id} — ${i.name} <${i.email}> (${i.sshHost})`,
      value: i.id,
    })),
  });
  return identities.find((i) => i.id === id)!;
}
