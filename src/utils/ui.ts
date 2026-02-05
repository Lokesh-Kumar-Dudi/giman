import chalk from 'chalk';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const TICK = '✓';
const CROSS = '✗';
const ARROW = '→';

let spinnerInterval: ReturnType<typeof setInterval> | null = null;

function clearLine(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\r\x1b[K');
  }
}

function stopSpinner(): void {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
}

/**
 * Run an async task with a loading spinner. Shows success or failure when done.
 */
export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
  options: { successMessage?: string; failureMessage?: string } = {}
): Promise<T> {
  const successMsg = options.successMessage ?? message;
  const failureMsg = options.failureMessage ?? message;
  let frameIndex = 0;

  const run = (): void => {
    if (!process.stdout.isTTY) return;
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length]!;
    process.stdout.write(`\r  ${chalk.cyan(frame)} ${message}...`);
    frameIndex++;
  };

  run();
  spinnerInterval = setInterval(run, 80);

  try {
    const result = await fn();
    stopSpinner();
    clearLine();
    process.stdout.write(`  ${chalk.green(TICK)} ${successMsg}\n`);
    return result;
  } catch (err) {
    stopSpinner();
    clearLine();
    process.stdout.write(`  ${chalk.red(CROSS)} ${failureMsg}\n`);
    if (err instanceof Error && err.message) {
      process.stdout.write(chalk.red(`    ${err.message}\n`));
    }
    throw err;
  }
}

/**
 * Print a step header (no spinner, just context).
 */
export function step(message: string): void {
  console.log(chalk.blue('\n  → ') + chalk.bold(message));
}

/**
 * Print a sub-step or info line.
 */
export function info(message: string): void {
  console.log(chalk.gray('    ') + message);
}

/**
 * Print success message with checkmark.
 */
export function success(message: string): void {
  console.log('  ' + chalk.green(TICK) + ' ' + message);
}

/**
 * Print failure message with cross.
 */
export function failure(message: string, detail?: string): void {
  console.log('  ' + chalk.red(CROSS) + ' ' + message);
  if (detail) {
    console.log(chalk.red('    ') + detail);
  }
}

/**
 * Print a section header.
 */
export function section(title: string): void {
  console.log('');
  console.log(chalk.bold.cyan('› ' + title));
}
