const CREDENTIALS_KEY = 'tpt_credentials';
const SESSION_KEY = 'tpt_session';
const SALT = 'tpt_2024_precision';

export interface StoredCredentials {
  username: string;
  passwordHash: string;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getCredentials(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as StoredCredentials) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: StoredCredentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export function isFirstRun(): boolean {
  return getCredentials() === null;
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function setAuthenticated(): void {
  sessionStorage.setItem(SESSION_KEY, '1');
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function login(username: string, password: string): Promise<boolean> {
  const creds = getCredentials();
  if (!creds) return false;
  if (username.trim().toLowerCase() !== creds.username.toLowerCase()) return false;
  const hash = await hashPassword(password);
  if (hash !== creds.passwordHash) return false;
  setAuthenticated();
  return true;
}

export async function setupAccount(username: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  saveCredentials({ username: username.trim(), passwordHash: hash });
  setAuthenticated();
}

export async function changeCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<boolean> {
  const creds = getCredentials();
  if (!creds) return false;
  const hash = await hashPassword(currentPassword);
  if (hash !== creds.passwordHash) return false;
  const newHash = await hashPassword(newPassword);
  saveCredentials({ username: newUsername.trim(), passwordHash: newHash });
  return true;
}
