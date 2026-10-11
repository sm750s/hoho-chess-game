import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

// 필수 환경 변수가 모두 있는지 확인
export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_DATABASE_URL
  );
}

let _db: Database | null = null;

// 실제 사용 시점에만 초기화 (Firebase 미설정 시 에러 방지)
export function getDb(): Database {
  if (_db) return _db;
  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _db = getDatabase(app);
  return _db;
}
