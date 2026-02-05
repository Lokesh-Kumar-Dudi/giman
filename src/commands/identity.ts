import chalk from 'chalk';
import type { Command } from 'commander';
import {
  listIdentities,
  getIdentity,
  addIdentity,
  updateIdentity,
  removeIdentity,
  applySshConfig,
} from '../services/identity.js';
import { promptSshKeySetup, promptIdentityFields, promptUpdateSshConfig } from '../utils/prompts.js';
import { resolveHome } from '../services/config.js';
import { section, info, success, failure, withSpinner } from '../utils/ui.js';
import type { Identity } from '../types/index.js';

function toTildePath(p: string): string {
  const home = process.env.HOME || '';
  if (home && p.startsWith(home + '/')) {
    return '~' + p.slice(home.length);
  }
  return p;
}

export function registerIdentityCommands(program: Command): void {
  const identity = program.command('identity').description('Manage git identities');

  identity
    .command('list')
    .description('List all identities')
    .action(async () => {
      const identities = await listIdentities();
      if (identities.length === 0) {
        section('Identities');
        info('No identities configured yet.');
        console.log('  Run ' + chalk.cyan('gib init') + ' or ' + chalk.cyan('gib identity add') + ' to get started.');
        return;
      }
      section('Identities');
      for (const i of identities) {
        const dirs = i.directories.length ? i.directories.join(', ') : '(none)';
        console.log('  ' + chalk.cyan(i.id) + `  ${i.name} <${i.email}>`);
        console.log(chalk.gray('    SSH: ') + toTildePath(i.sshKeyPath) + chalk.gray('  Host: ') + i.sshHost);
        console.log(chalk.gray('    Directories: ') + dirs);
        console.log();
      }
    });

  identity
    .command('add')
    .description('Add a new identity (interactive)')
    .action(async () => {
      section('Add identity');
      info('You\'ll set a name, email, and SSH key. This identity can then be used for specific directories.');
      console.log('');

      const fields = await promptIdentityFields();
      const keyChoice = await promptSshKeySetup(fields.id);
      const identityData: Identity = {
        id: fields.id,
        name: fields.name,
        email: fields.email,
        sshKeyPath: keyChoice.path,
        sshHost: fields.sshHost,
        directories: [],
      };

      await withSpinner(
        'Saving identity to config',
        () => addIdentity(identityData),
        { successMessage: 'Identity saved', failureMessage: 'Failed to add identity' }
      );

      const identities = await listIdentities();
      const updateSsh = await promptUpdateSshConfig();
      if (updateSsh) {
        await withSpinner(
          'Updating ~/.ssh/config',
          () => applySshConfig(identities, async () => Promise.resolve(true)).then(() => undefined),
          { successMessage: 'SSH config updated', failureMessage: 'Failed to update SSH config' }
        );
      }

      console.log('');
      success('Identity "' + fields.id + '" added.');
      info('Map directories to this identity: ' + chalk.cyan('gib dir add <path> --identity ' + fields.id));
    });

  identity
    .command('edit <id>')
    .description('Edit an existing identity')
    .action(async (id: string) => {
      const existing = await getIdentity(id);
      if (!existing) {
        failure('Identity not found', `"${id}" is not in your config. Use gib identity list to see identities.`);
        process.exit(1);
      }
      section('Edit identity: ' + id);
      info('Update the fields below. Leave as-is or change as needed.');
      console.log('');

      const fields = await promptIdentityFields(existing);
      await withSpinner(
        'Updating identity',
        () => updateIdentity(id, { name: fields.name, email: fields.email, sshHost: fields.sshHost }),
        { successMessage: 'Identity updated', failureMessage: 'Failed to update identity' }
      );
      console.log('');
      success('Identity "' + id + '" updated.');
    });

  identity
    .command('remove <id>')
    .description('Remove an identity')
    .action(async (id: string) => {
      const existing = await getIdentity(id);
      if (!existing) {
        failure('Identity not found', `"${id}" is not in your config. Use gib identity list to see identities.`);
        process.exit(1);
      }
      await withSpinner(
        'Removing identity from config',
        () => removeIdentity(id),
        { successMessage: 'Identity removed from config', failureMessage: 'Failed to remove identity' }
      );
      const identities = await listIdentities();
      await withSpinner(
        'Updating ~/.ssh/config',
        () => applySshConfig(identities, async () => Promise.resolve(true)).then(() => undefined),
        { successMessage: 'SSH config updated', failureMessage: 'Failed to update SSH config' }
      );
      console.log('');
      success('Identity "' + id + '" removed.');
    });

  identity
    .command('show <id>')
    .description('Show identity details')
    .action(async (id: string) => {
      const i = await getIdentity(id);
      if (!i) {
        failure('Identity not found', `"${id}" is not in your config. Use gib identity list to see identities.`);
        process.exit(1);
      }
      section('Identity: ' + i.id);
      console.log('  Name:      ' + i.name);
      console.log('  Email:     ' + i.email);
      console.log('  SSH key:   ' + toTildePath(i.sshKeyPath));
      console.log('  SSH host:  ' + i.sshHost);
      console.log('  Directories:');
      if (i.directories.length) {
        i.directories.forEach((d) => console.log('    ' + toTildePath(d)));
      } else {
        console.log(chalk.gray('    (none) — add with gib dir add <path> --identity ' + i.id));
      }
    });
}
