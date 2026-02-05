import chalk from 'chalk';
import { readConfig } from '../services/config.js';
import { applySshConfig, refreshGitconfigIncludeIf } from '../services/identity.js';
import { syncAllIdentityGitconfigs } from '../services/git-config.js';
import { promptUpdateSshConfig } from '../utils/prompts.js';
import { section, info, success, failure, withSpinner } from '../utils/ui.js';

export async function runApply(): Promise<void> {
  const config = await readConfig();
  if (!config || config.identities.length === 0) {
    failure('Nothing to apply', 'No config or identities found. Run gib init first.');
    process.exit(1);
  }

  section('Apply configuration');
  info('This will write the current identities to ~/.ssh/config and ~/.gitconfig.');
  console.log('');

  const updateSsh = await promptUpdateSshConfig();
  if (updateSsh) {
    await withSpinner(
      'Updating ~/.ssh/config',
      () => applySshConfig(config.identities, async () => Promise.resolve(true)).then(() => undefined),
      { successMessage: 'SSH config updated', failureMessage: 'Failed to update SSH config' }
    );
  }

  await withSpinner(
    'Writing identity gitconfigs to ~/.gitbro/gitconfigs',
    () => syncAllIdentityGitconfigs(config.identities),
    { successMessage: 'Git config files written', failureMessage: 'Failed to write git configs' }
  );

  await withSpinner(
    'Updating ~/.gitconfig includeIf rules',
    () => refreshGitconfigIncludeIf(config),
    { successMessage: 'Git config updated', failureMessage: 'Failed to update ~/.gitconfig' }
  );

  console.log('');
  success('Configuration applied. Your identities and directory mappings are now active.');
}
