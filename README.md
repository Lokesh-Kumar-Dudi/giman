# GiMan (gid) — Documentation

  

Manage multiple Git identities via SSH so you can use personal and work GitHub accounts on the same machine.

**Links:** [Source code](https://github.com/lokesh-kumar-dudi/giman) · [Issues](https://github.com/lokesh-kumar-dudi/giman/issues) · [Documentation (web)](https://lokesh-kumar-dudi.github.io/giman/)

  

---

  

## Install

  

```bash

npm  install  -g  giman

```

  

Requires **Node.js 18+**.

  

---

  

## Quick start

  

1.  **Initialize** (creates `~/.giman/config.json`, detects existing config):

  

```bash

gid init

```

  

2.  **Map directories** to identities so Git uses the right identity per folder:

  

```bash

gid dir add ~/dev/personal --identity personal

gid dir add ~/dev/work --identity work

```

  

3.  **Check current identity** in the current directory:

  

```bash

gid status

```

  

---

  

## Commands reference

  


| Command                             | Description                                                         |
|-------------------------------------|---------------------------------------------------------------------|
| `gid init`                          | Interactive setup and config detection                               |
| `gid status`                        | Show active identity for the current directory                       |
| `gid apply`                         | Apply config to `~/.gitconfig` and `~/.ssh/config`                   |
| `gid clone <repo-url> [directory]`  | Clone a repo; prompts to select identity (profile) for the clone     |
| `gid identity list`                 | List all identities                                                  |
| `gid identity add`                  | Add a new identity (interactive)                                     |
| `gid identity edit <id>`            | Edit an existing identity                                            |
| `gid identity remove <id>`          | Remove an identity                                                   |
| `gid identity show <id>`            | Show details for one identity                                        |
| `gid dir add <path> --identity <id>`| Map a directory to an identity                                       |
| `gid dir remove <path>`             | Remove a directory mapping                                           |
| `gid dir list`                      | List all directory mappings                                          |


  

---

  

## Command details

  

###  `gid init`

  

**What it does:** One-time interactive setup. If you don’t have config yet, it walks you through creating your first identity (ID, name, email, SSH key path, SSH host alias). It then creates `~/.giman/config.json`, writes per-identity Git configs, updates `~/.gitconfig` with `includeIf` rules, and optionally updates `~/.ssh/config` with Host blocks.

  

**If config already exists:** It detects your existing identities and asks whether to apply them now (write to `~/.ssh/config` and `~/.gitconfig`). Use this after cloning your config to a new machine or to re-apply after manual edits.

  

**When to use:** First time setup, or after moving to a new machine. Run once before using other commands.

  

```bash
gid  init
```

  

---

  

### `gid status`

  

**What it does:** Shows which identity is active for your **current working directory**. It looks up your CWD in the directory mappings and prints the matching identity (id, name, email), or tells you no identity is mapped and suggests `gid dir add . --identity <id>`.

  

**When to use:** To confirm which account Git will use for commits and SSH in the current folder.

  

```bash
cd  ~/dev/work/project

gid  status
# Identity: work — John Doe <john@company.com>

```

---

  

### `gid apply`

  

**What it does:** Writes the **current** state of `~/.giman/config.json` out to the system: updates `~/.ssh/config` (Host blocks for each identity), writes identity gitconfigs under `~/.giman/gitconfigs`, and refreshes `~/.gitconfig` includeIf rules. It will prompt before modifying `~/.ssh/config`.

  

**When to use:** After you’ve added/edited identities or directory mappings (e.g. via `gid identity add`, `gid dir add`, or by editing the JSON) and want those changes to take effect. Also useful if you manually changed `~/.ssh/config` or `~/.gitconfig` and want to re-sync from GiMan.

  

```bash
gid  apply
```

  

---

  

### `gid clone <repo-url> [directory]`

  

**What it does:** Clones a repository using an SSH URL (e.g. `git@github.com:user/repo.git`). Prompts you to **select an identity (profile)** from your configured identities; then rewrites the URL to use that identity’s SSH host alias and runs `git clone`. Optional second argument is the target directory (same as `git clone <url> [directory]`).

  

**When to use:** When you want to clone a repo and have GiMan prompt you to pick which account/identity to use, without remembering or typing the SSH host alias.

  

```bash
gid  clone  git@github.com:someone/repo.git
# Prompts: Select identity (profile) for this clone: personal / work / ...

gid  clone  git@github.com:someone/repo.git  ./my-repo
# Same, but clones into ./my-repo
```

  

---

  

### `gid identity list`

  

**What it does:** Lists every identity in your config. For each identity it shows: id, name, email, SSH key path (tilde form), SSH host alias, and which directories are mapped to it.

  

**When to use:** To see all identities and their mappings at a glance.

  

```bash
gid  identity  list
```

  

---

  

### `gid identity add`

  

**What it does:** Interactive flow to add a **new** identity. Prompts for: identity ID (e.g. `personal`, `work`), display name, email, and SSH key (path or generate new). Saves to config and optionally updates `~/.ssh/config`. The new identity has no directories until you run `gid dir add`.

  

**When to use:** When you need a second (or third) GitHub account or Git identity on the same machine.

  

```bash
gid  identity  add
```

  

---

  

### `gid identity edit <id>`

  

**What it does:** Edits an existing identity by **id**. Prompts for name, email, and SSH host alias (existing values pre-filled). Updates only those fields in config; it does **not** change the SSH key path. After editing, run `gid apply` if you want SSH/gitconfig rewritten immediately.

  

**When to use:** You changed your name/email or want to rename the SSH host alias (e.g. `github-work` → `github-company`).

  

```bash
gid  identity  edit  work
```

  

---

  

### `gid identity remove <id>`

  

**What it does:** Removes the identity with the given **id** from config and removes all directory mappings that pointed to it. Then rewrites `~/.ssh/config` so that Host block is gone.

  

**When to use:** You no longer use that account or identity on this machine.

  

```bash
gid  identity  remove  work
```

  

---

  

### `gid identity show <id>`

  

**What it does:** Prints full details for one identity: name, email, SSH key path, SSH host alias, and the list of directories mapped to it. Exits with an error if the id doesn’t exist.

  

**When to use:** To double-check one identity’s settings and which paths use it.

  

```bash
gid  identity  show  personal
```

  

---

  

### `gid dir add <path> --identity <id>`

  

**What it does:** Maps a **directory path** to an identity. Any repo inside that path (including subdirectories) will use that identity’s `user.name`, `user.email`, and SSH key. Path can be absolute or use `~`; `.` means current directory. The identity must already exist (from `gid init` or `gid identity add`).

  

**Options:**  `-i, --identity <id>` (required) — the identity id to attach the path to.

  

**When to use:** When you want “everything under this folder” to use a specific account (e.g. `~/dev/personal` → personal, `~/dev/work` → work).

  

```bash
gid  dir  add  ~/dev/personal  --identity  personal
gid  dir  add  .  --identity  work
```

  

---

  

### `gid dir remove <path>`

  

**What it does:** Removes the directory mapping for the given path. The path is resolved the same way as for `dir add` (e.g. `~` expanded). Repos under that path will no longer auto-use an identity from GiMan until you add a mapping again.

  

**When to use:** You moved a project or no longer want that folder to use a specific identity.

  

```bash
gid  dir  remove  ~/dev/work
```

  

---

  

### `gid dir list`

  

**What it does:** Lists all directory-to-identity mappings. For each identity that has directories, it prints the identity id and the paths mapped to it.

  

**When to use:** To see which folders are tied to which identity.

  

```bash
gid  dir  list
```

  

---

  

## Examples

  

### Add and use two identities

  

```bash
# One-time setup
gid  init
# Create "personal" (name, email, SSH key path)

# Create "work" (name, email, SSH key path)
gid  dir  add  ~/dev/personal  --identity  personal
gid  dir  add  ~/dev/work  --identity  work
gid  apply

```

  

### Clone with the right identity

  

**Option 1 — use `gid clone` (prompts for profile):**

  

```bash
gid  clone  git@github.com:username/my-repo.git
# Prompts you to select an identity (personal, work, …), then clones with that identity
```

  

**Option 2 — use the SSH host alias directly:**

  

| Identity  | SSH Host Alias (used in URL) | Example Clone URL                                  |
|-----------|------------------------------|----------------------------------------------------|
| personal  | `github-personal`            | `git@github-personal:username/repo.git`            |
| work      | `github-work`                | `git@github-work:company/repo.git`                 |


```bash
cd  ~/dev/personal
git  clone  git@github-personal:username/my-repo.git

cd  ~/dev/work
git  clone  git@github-work:company/project.git

```

  

### Commits and push (automatic in mapped dirs)

  

Inside a mapped directory, `user.name` and `user.email` are set automatically; SSH uses the right key for push.

  

```bash
cd  ~/dev/work/project

git  config  user.email
# john@company.com

git  commit  -m  "feat: add feature"
# Committed as: John Doe <john@company.com>

git  push  origin  main
# Uses the correct SSH key
```

  

### Fix existing repo to use an identity

  

Point the remote at the identity’s SSH host alias:

  

```bash

cd  ~/dev/personal/existing-repo

git  remote  set-url  origin  git@github-personal:username/existing-repo.git

git  remote  -v

# origin git@github-personal:username/existing-repo.git (fetch)

# origin git@github-personal:username/existing-repo.git (push)

```

  

### List and inspect

  

```bash
gid  identity  list

gid  identity  show  personal

gid  dir  list

gid  status
```

  

---

  

## Config location

  

-  **GiMan config:**  `~/.giman/config.json` (identities, SSH key paths, directory mappings).

-  **Git:**  `~/.gitconfig` gets `includeIf` directives when you run `gid init`, `gid identity add`, `gid dir add`, or `gid apply`.

-  **SSH:**  `~/.ssh/config` gets `Host` blocks for each identity (e.g. `github-personal`, `github-work`) when you run those commands (with your permission).

  

---

  

## License

  

MIT.