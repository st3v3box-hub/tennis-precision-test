const ACCOUNTS_KEY = 'tpt_accounts';
const SESSION_KEY = 'tpt_session';
const SESSION_USER_KEY = 'tpt_session_user';
const SALT = 'tpt_2024_precision';

// Legacy keys (migrated automatically on first load)
const LEGACY_ADMIN_KEY = 'tpt_credentials';
const LEGACY_COACH_KEY = 'tpt_cred_coach';
const LEGACY_VIEWER_KEY = 'tpt_cred_viewer';

export type UserRole = 'admin' | 'coach' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Amministratore',
  coach: 'Maestro',
  viewer: 'Genitore / Allievo',
};

export interface Account {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
}

/** @deprecated kept for backward compat */
export interface StoredCredentials {
  username: string;
  passwordHash: string;
}

// ── internal helpers ──────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadAccounts(): Account[] {
  // New unified format
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw) as Account[];
  } catch { /* fall through to migration */ }

  // Migrate from legacy per-role keys
  const migrated: Account[] = [];
  const legacyMap: [string, UserRole][] = [
    [LEGACY_ADMIN_KEY, 'admin'],
    [LEGACY_COACH_KEY, 'coach'],
    [LEGACY_VIEWER_KEY, 'viewer'],
  ];
  for (const [key, role] of legacyMap) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const creds = JSON.parse(raw) as StoredCredentials;
      migrated.push({ id: genId(), username: creds.username, passwordHash: creds.passwordHash, role });
    } catch { /* skip */ }
  }

  if (migrated.length > 0) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_ADMIN_KEY);
    localStorage.removeItem(LEGACY_COACH_KEY);
    localStorage.removeItem(LEGACY_VIEWER_KEY);
  }
  return migrated;
}

function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function setAuthenticated(role: UserRole, username: string): void {
  sessionStorage.setItem(SESSION_KEY, role);
  sessionStorage.setItem(SESSION_USER_KEY, username);
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
  if (raw === '1') return 'admin'; // backward compat
  if (raw === 'admin' || raw === 'coach' || raw === 'viewer') return raw as UserRole;
  return null;
}

export function isAuthenticated(): boolean {
  return getCurrentRole() !== null;
}

/** Returns the credentials of the currently logged-in user. */
export function getCredentials(): StoredCredentials | null {
  const role = getCurrentRole();
  if (!role) return null;

  const sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
  const accounts = loadAccounts();

  if (sessionUser) {
    const acc = accounts.find(a => a.username === sessionUser && a.role === role);
    if (acc) return { username: acc.username, passwordHash: acc.passwordHash };
  }

  // Fallback for sessions created before username was stored in session
  const acc = accounts.find(a => a.role === role);
  if (acc) {
    sessionStorage.setItem(SESSION_USER_KEY, acc.username);
    return { username: acc.username, passwordHash: acc.passwordHash };
  }
  return null;
}

/** Returns all accounts for a given role (for admin account management). */
export function getAccountsByRole(role: UserRole): { id: string; username: string }[] {
  return loadAccounts()
    .filter(a => a.role === role)
    .map(a => ({ id: a.id, username: a.username }));
}

export function hasAccount(role: UserRole): boolean {
  return loadAccounts().some(a => a.role === role);
}

export function isFirstRun(): boolean {
  return !hasAccount('admin');
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
}

export function can(action: 'createTest' | 'editPlayers' | 'manageAccounts'): boolean {
  const role = getCurrentRole();
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'coach') return action === 'createTest' || action === 'editPlayers';
  return false;
}

export async function login(username: string, password: string): Promise<UserRole | null> {
  const hash = await hashPassword(password);
  const accounts = loadAccounts();
  const match = accounts.find(
    a => a.username.toLowerCase() === username.trim().toLowerCase() && a.passwordHash === hash
  );
  if (match) {
    setAuthenticated(match.role, match.username);
    return match.role;
  }
  return null;
}

export async function setupAccount(username: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  const accounts = loadAccounts();
  accounts.push({ id: genId(), username: username.trim(), passwordHash: hash, role: 'admin' });
  saveAccounts(accounts);
  setAuthenticated('admin', username.trim());
}

export async function changeCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<boolean> {
  try {
    const sessionUser = sessionStorage.getItem(SESSION_USER_KEY) ?? '';
    const hash = await hashPassword(currentPassword);
    const accounts = loadAccounts();
    const idx = accounts.findIndex(
      a => a.username.toLowerCase() === sessionUser.toLowerCase() && a.passwordHash === hash
    );
    if (idx === -1) return false;
    const newHash = await hashPassword(newPassword);
    accounts[idx] = { ...accounts[idx], username: newUsername.trim(), passwordHash: newHash };
    saveAccounts(accounts);
    sessionStorage.setItem(SESSION_USER_KEY, newUsername.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Create or update a coach/viewer account.
 * - id undefined → create new account
 * - id provided  → update existing (empty password = keep existing)
 * Returns the account id.
 */
export async function upsertAccount(
  role: 'coach' | 'viewer',
  username: string,
  password: string,
  id?: string
): Promise<string> {
  const accounts = loadAccounts();

  if (id) {
    const idx = accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      const newHash = password ? await hashPassword(password) : accounts[idx].passwordHash;
      accounts[idx] = { ...accounts[idx], username: username.trim(), passwordHash: newHash };
      saveAccounts(accounts);
      return id;
    }
  }

  // Create new
  const newId = genId();
  const hash = await hashPassword(password);
  accounts.push({ id: newId, username: username.trim(), passwordHash: hash, role });
  saveAccounts(accounts);
  return newId;
}

/** Remove an account by id. Admin accounts cannot be removed this way. */
export function removeAccount(id: string): void {
  const accounts = loadAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target || target.role === 'admin') return;
  saveAccounts(accounts.filter(a => a.id !== id));
}
