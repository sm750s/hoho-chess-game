export interface GameRecord {
  white: string;
  black: string;
  result: 'white' | 'black' | 'draw';
  date: string;
  ruleset: string;
}

const STORAGE_KEY = 'chess-records';

export function saveResult(record: GameRecord): void {
  const records = getRecords();
  records.push(record);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
}

export function getRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch { return []; }
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}
