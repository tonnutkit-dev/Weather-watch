// QA-only signatures for the two Node file operations used by this harness.
// No dependency additions and no effect on production/browser code.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
}
declare const process: { env: Record<string, string | undefined>; cwd(): string };
