import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  appInstance = initializeApp(firebaseConfig);
  dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase Firestore initialization skipped in restricted context:', err);
}

try {
  if (appInstance) {
    authInstance = getAuth(appInstance);
  }
} catch (err) {
  console.warn('Firebase Auth initialization skipped in restricted iframe context:', err);
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo:
        authInstance?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!dbInstance) return;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 500);
}

export async function syncAuthenticatedPlayerAccountToFirestore(account: {
  username: string;
  displayName: string;
  avatar: string;
  region: 'VN' | 'SEA' | 'GLOBAL';
  elo: number;
  matchesPlayed: number;
  wins: number;
}) {
  if (!dbInstance || !authInstance?.currentUser?.uid || !authInstance?.currentUser?.emailVerified) {
    return;
  }
  const uid = authInstance.currentUser.uid;
  const sanitizedUsername = account.username
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);
  const path = `player_accounts/${uid}`;
  try {
    const accountRef = doc(dbInstance, 'player_accounts', uid);
    const existingSnap = await getDoc(accountRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;
    const defaultUsername =
      sanitizedUsername.length >= 3 ? sanitizedUsername : `usr_${uid.slice(0, 8)}`;

    await setDoc(
      accountRef,
      {
        ownerId: uid,
        username:
          existingData && typeof existingData.username === 'string'
            ? existingData.username
            : defaultUsername,
        displayName: account.displayName.slice(0, 40),
        avatar: account.avatar.slice(0, 16),
        region: account.region,
        elo: Math.max(0, Math.min(10000, Math.round(account.elo))),
        matchesPlayed: Math.max(0, Math.min(100000, Math.round(account.matchesPlayed))),
        wins: Math.max(0, Math.min(100000, Math.round(account.wins))),
        createdAt:
          existingData && existingData.createdAt ? existingData.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
