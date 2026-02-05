import chalk from 'chalk';
import type { Command } from 'commander';
import { readConfig } from '../services/config.js';
import { addDirectoryToIdentity, removeDirectory, listIdentities } from '../services/identity.js';
import { resolveHome } from '../services/config.js';
import { section, info, success, failure, withSpinner } from '../utils/ui.js';

function toTildePath(p: string): string {
  const home = process.env.HOME || '';
  if (home && p.startsWith(home + '/')) {
    return '~' + p.slice(home.length);
  }
  return p;
}

export function registerDirectoryCommands(program: Command): void {
  const dir = program.command('dir').description('Manage directory-to-identity mappings');

  dir
    .command('add <path>')
    .description('Add a directory to an identity')
    .requiredOption('-i, --identity <id>', 'Identity ID')
    .action(async (pathArg: string, opts: { identity: string }) => {
      const config = await readConfig();
      if (!config) {
        failure('No config found', 'Run gib init first to create ~/.gitbuddy/config.json');
        process.exit(1);
      }
      const normalized = resolveHome(pathArg);
      try {
        await withSpinner(
          'Adding directory to identity "' + opts.identity + '"',
          () => addDirectoryToIdentity(opts.identity, pathArg),
          {
            successMessage: `Directory ${toTildePath(normalized)} mapped to ${opts.identity}`,
            failureMessage: 'Failed to add directory',
          }
        );
        console.log('');
        success('Git will use identity "' + opts.identity + '" for repos under ' + toTildePath(normalized) + '.');
      } catch {
        process.exit(1);
      }
    });

  dir
    .command('remove <path>')
    .description('Remove a directory mapping')
    .action(async (pathArg: string) => {
      const normalized = resolveHome(pathArg);
      await withSpinner(
        'Removing directory mapping',
        () => removeDirectory(pathArg),
        {
          successMessage: 'Directory mapping removed: ' + toTildePath(normalized),
          failureMessage: 'Failed to remove mapping',
        }
      );
      console.log('');
      success('Done.');
    });

  dir
    .command('list')
    .description('List all directory mappings')
    .action(async () => {
      const identities = await listIdentities();
      const withDirs = identities.filter((i) => i.directories.length > 0);
      if (withDirs.length === 0) {
        section('Directory mappings');
        info('No directory mappings yet. Git will not auto-switch identity by folder.');
        console.log('  Add one: ' + chalk.cyan('gib dir add ~/path --identity <id>'));
        return;
      }
      section('Directory mappings');
      info('Repos under these paths use the identity shown.');
      console.log('');
      for (const i of identities) {
        if (i.directories.length === 0) continue;
        console.log('  ' + chalk.cyan(i.id) + ':');
        for (const d of i.directories) {
          console.log('    ' + toTildePath(d));
        }
        console.log();
      }
    });
}
