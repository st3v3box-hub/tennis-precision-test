import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const SESSION_KEY = 'tpt_session';
const SESSION_USER_KEY = 'tpt_session_user';
const SALT = 'tpt_2024_precision';

// Legacy localStorage keys (for one-time migration)
const ACCOUNTS_KEY = 'tpt_accounts';
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

/** Reads accounts from localStorage only — used for one-time migration. */
function loadLocalAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw) as Account[];
  } catch { /* fall through */ }

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

/** Loads accounts from Firestore, migrating from localStorage on first run. */
async function loadAccounts(): Promise<Account[]> {
  const snap = await getDocs(collection(db, 'accounts'));
  if (!snap.empty) {
    return snap.docs.map(d => d.data() as Account);
  }

  // Firestore empty — migrate from localStorage
  const local = loadLocalAccounts();
  if (local.length > 0) {
    await Promise.all(local.map(acc => setDoc(doc(db, 'accounts', acc.id), acc)));
  }
  return local;
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
  const username = sessionStorage.getItem(SESSION_USER_KEY);
  if (username) return { username, passwordHash: '' };
  return null;
}

export async function getAccountsByRole(role: UserRole): Promise<{ id: string; username: string }[]> {
  const accounts = await loadAccounts();
  return accounts.filter(a => a.role === role).map(a => ({ id: a.id, username: a.username }));
}

export async function hasAccount(role: UserRole): Promise<boolean> {
  const accounts = await loadAccounts();
  return accounts.some(a => a.role === role);
}

export async function isFirstRun(): Promise<boolean> {
  return !(await hasAccount('admin'));
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
  const accounts = await loadAccounts();
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
  const id = genId();
  const acc: Account = { id, username: username.trim(), passwordHash: hash, role: 'admin' };
  await setDoc(doc(db, 'accounts', id), acc);
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
    const accounts = await loadAccounts();
    const target = accounts.find(
      a => a.username.toLowerCase() === sessionUser.toLowerCase() && a.passwordHash === hash
    );
    if (!target) return false;
    const newHash = await hashPassword(newPassword);
    const updated: Account = { ...target, username: newUsername.trim(), passwordHash: newHash };
    await setDoc(doc(db, 'accounts', target.id), updated);
    sessionStorage.setItem(SESSION_USER_KEY, newUsername.trim());
    return true;
  } catch {
    return false;
  }
}

export async function upsertAccount(
  role: 'coach' | 'viewer',
  username: string,
  password: string,
  id?: string
): Promise<string> {
  const accounts = await loadAccounts();

  if (id) {
    const existing = accounts.find(a => a.id === id);
    if (existing) {
      const newHash = password ? await hashPassword(password) : existing.passwordHash;
      const updated: Account = { ...existing, username: username.trim(), passwordHash: newHash };
      await setDoc(doc(db, 'accounts', id), updated);
      return id;
    }
  }

  const newId = genId();
  const hash = await hashPassword(password);
  const acc: Account = { id: newId, username: username.trim(), passwordHash: hash, role };
  await setDoc(doc(db, 'accounts', newId), acc);
  return newId;
}

export async function removeAccount(id: string): Promise<void> {
  const accounts = await loadAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target || target.role === 'admin') return;
  await deleteDoc(doc(db, 'accounts', id));
}
