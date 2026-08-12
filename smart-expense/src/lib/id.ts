// Minimal CUID-like ID: URL-safe, sortable-ish, no external dep.
const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createId(): string {
  const time = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  }
  return `${time}${rand}`;
}
