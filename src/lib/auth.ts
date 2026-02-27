const CREDENTIALS_KEY = 'tpt_credentials';
const CREDENTIALS_KEY_COACH = 'tpt_cred_coach';
const CREDENTIALS_KEY_VIEWER = 'tpt_cred_viewer';
const SESSION_KEY = 'tpt_session';
const SALT = 'tpt_2024_precision';

export type UserRole = 'admin' | 'coach' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Amministratore',
  coach: 'Maestro',
  viewer: 'Genitore / Allievo',
};

export interface StoredCredentials {
  username: string;
  passwordHash: string;
}

// ── internal helpers ──────────────────────────────────────────────────────────

function storageKeyForRole(role: UserRole): string {
  if (role === 'admin') return CREDENTIALS_KEY;
  if (role === 'coach') return CREDENTIALS_KEY_COACH;
  return CREDENTIALS_KEY_VIEWER;
}

function saveCredentials(role: UserRole, creds: StoredCredentials): void {
  localStorage.setItem(storageKeyForRole(role), JSON.stringify(creds));
}

function setAuthenticated(role: UserRole): void {
  sessionStorage.setItem(SESSION_KEY, role);
}

// ── exports ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getCurrentRole(): UserRole | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  // backward compat: old sessions stored '1' meaning admin
  if (raw === '1') return 'admin';
  if (raw === 'admin' || raw === 'coach' || raw === 'viewer') return raw as UserRole;
  return null;
}

export function isAuthenticated(): boolean {
  return getCurrentRole() !== null;
}

export function getCredentials(): StoredCredentials | null {
  const role = getCurrentRole();
  if (!role) return null;
  try {
    const raw = localStorage.getItem(storageKeyForRole(role));
    return raw ? (JSON.parse(raw) as StoredCredentials) : null;
  } catch { return null; }
}

export function getAccountInfo(role: UserRole): { username: string } | null {
  try {
    const raw = localStorage.getItem(storageKeyForRole(role));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCredentials;
    return { username: parsed.username };
  } catch {
    return null;
  }
}

export function hasAccount(role: UserRole): boolean {
  try {
    const raw = localStorage.getItem(storageKeyForRole(role));
    return raw !== null;
  } catch {
    return false;
  }
}

export function isFirstRun(): boolean {
  return !hasAccount('admin');
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function can(action: 'createTest' | 'editPlayers' | 'manageAccounts'): boolean {
  const role = getCurrentRole();
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'coach') return action === 'createTest' || action === 'editPlayers';
  // viewer
  return false;
}

export async function login(username: string, password: string): Promise<UserRole | null> {
  const hash = await hashPassword(password);
  const rolesToCheck: UserRole[] = ['admin', 'coach', 'viewer'];

  for (const role of rolesToCheck) {
    try {
      const raw = localStorage.getItem(storageKeyForRole(role));
      if (!raw) continue;
      const creds = JSON.parse(raw) as StoredCredentials;
      if (
        username.trim().toLowerCase() === creds.username.toLowerCase() &&
        hash === creds.passwordHash
      ) {
        setAuthenticated(role);
        return role;
      }
    } catch {
      // continue to next role
    }
  }

  return null;
}

export async function setupAccount(username: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  saveCredentials('admin', { username: username.trim(), passwordHash: hash });
  setAuthenticated('admin');
}

export async function changeCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<boolean> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return false;
    const creds = JSON.parse(raw) as StoredCredentials;
    const hash = await hashPassword(currentPassword);
    if (hash !== creds.passwordHash) return false;
    const newHash = await hashPassword(newPassword);
    saveCredentials('admin', { username: newUsername.trim(), passwordHash: newHash });
    return true;
  } catch {
    return false;
  }
}

export async function upsertAccount(
  role: 'coach' | 'viewer',
  username: string,
  password: string
): Promise<void> {
  const hash = await hashPassword(password);
  saveCredentials(role, { username: username.trim(), passwordHash: hash });
}

export function removeAccount(role: 'coach' | 'viewer'): void {
  localStorage.removeItem(storageKeyForRole(role));
}
