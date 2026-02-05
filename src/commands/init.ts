import chalk from 'chalk';
import inquirer from 'inquirer';
import { configExists, readConfig, writeConfig } from '../services/config.js';
import { applySshConfig, refreshGitconfigIncludeIf } from '../services/identity.js';
import { syncAllIdentityGitconfigs } from '../services/git-config.js';
import { promptIdentityFields, promptSshKeySetup, promptUpdateSshConfig } from '../utils/prompts.js';
import { section, info, success, withSpinner } from '../utils/ui.js';
import type { Identity } from '../types/index.js';

export async function runInit(): Promise<void> {
  const exists = await configExists();
  if (exists) {
    const config = await readConfig();
    if (config && config.identities.length > 0) {
      section('Existing configuration');
      info(`Found ${config.identities.length} identity/identities in ~/.gitbro/config.json`);
      console.log('');
      const { apply } = await inquirer.prompt<{ apply: boolean }>({
        type: 'confirm',
        name: 'apply',
        message: 'Apply it now? (writes to ~/.ssh/config and ~/.gitconfig)',
        default: true,
      });
      if (apply) {
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
        success('Configuration applied. You can use gib status and gib dir list to check.');
      }
      return;
    }
  }

  section('Set up your first identity');
  info('We\'ll create one identity (name, email, SSH key) and save it to ~/.gitbro.');
  console.log('');

  const fields = await promptIdentityFields();
  const keyChoice = await promptSshKeySetup(fields.id);
  const identity: Identity = {
    id: fields.id,
    name: fields.name,
    email: fields.email,
    sshKeyPath: keyChoice.path,
    sshHost: fields.sshHost,
    directories: [],
  };

  await withSpinner(
    'Saving config to ~/.gitbro/config.json',
    () => writeConfig({ identities: [identity], defaultIdentity: identity.id }),
    { successMessage: 'Config saved', failureMessage: 'Failed to save config' }
  );

  const identities = await readConfig();
  if (identities) {
    await withSpinner(
      'Writing identity gitconfig',
      () => syncAllIdentityGitconfigs(identities.identities),
      { successMessage: 'Identity gitconfig written', failureMessage: 'Failed to write gitconfig' }
    );
    await withSpinner(
      'Updating ~/.gitconfig (includeIf for directories)',
      () => refreshGitconfigIncludeIf(identities),
      { successMessage: 'Git config updated', failureMessage: 'Failed to update ~/.gitconfig' }
    );
  }

  const updateSsh = await promptUpdateSshConfig();
  if (updateSsh && identities) {
    await withSpinner(
      'Updating ~/.ssh/config',
      () => applySshConfig(identities.identities, async () => Promise.resolve(true)).then(() => undefined),
      { successMessage: 'SSH config updated', failureMessage: 'Failed to update SSH config' }
    );
  }

  console.log('');
  success('Setup complete.');
  info('Add directories so git uses this identity automatically:');
  console.log(chalk.cyan('  gib dir add ~/path --identity ' + fields.id));
}
