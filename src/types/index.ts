import { z } from 'zod';

/** Safe for use in file paths and Host names: no path traversal, no newlines. */
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
/** No newlines or double-quotes to prevent config file injection. */
const SAFE_SSH_HOST_REGEX = /^[^\n"]+$/;

export const IdentitySchema = z.object({
  id: z.string().min(1).max(128).regex(SAFE_ID_REGEX, 'Identity ID must contain only letters, numbers, underscore, and hyphen'),
  name: z.string().min(1),
  email: z.string().email(),
  sshKeyPath: z.string().min(1),
  sshHost: z.string().min(1).max(256).regex(SAFE_SSH_HOST_REGEX, 'SSH host must not contain newlines or double quotes'),
  directories: z.array(z.string()).default([]),
});

export type Identity = z.infer<typeof IdentitySchema>;

export const ConfigSchema = z.object({
  identities: z.array(IdentitySchema),
  defaultIdentity: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG_PATH = '~/.gitbuddy/config.json';
export const DEFAULT_GITBUDDY_DIR = '~/.gitbuddy';
export const DEFAULT_GITCONFIGS_DIR = '~/.gitbuddy/gitconfigs';
export const DEFAULT_SSH_DIR = '~/.ssh';
export const GITBUDDY_SSH_CONFIG_MARKER = '# GitBuddy:';
