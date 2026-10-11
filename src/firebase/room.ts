import { ref, set, update, onValue, off, get } from 'firebase/database';
import { getDb } from './config';
import type { RoomDoc, SerializedMove, FirebaseGameOver } from '../core/onlineTypes';
import type { Color, Piece } from '../core/types';

export async function createRoom(
  roomId: string,
  rulesetName: string,
  playerName: string,
  uid: string,
  initialFen: string,
): Promise<void> {
  const room: RoomDoc = {
    status: 'waiting',
    rulesetName,
    white: { name: playerName, uid },
    black: null,
    fen: initialFen,
    moveCount: 0,
    movesJson: '[]',
    capturesByWhiteJson: '[]',
    capturesByBlackJson: '[]',
    gameOver: null,
    createdAt: Date.now(),
  };
  await set(ref(getDb(), `rooms/${roomId}`), room);
}

export async function joinRoom(
  roomId: string,
  playerName: string,
  uid: string,
): Promise<{ color: Color; whiteName: string; rulesetName: string } | null> {
  const snap = await get(ref(getDb(), `rooms/${roomId}`));
  if (!snap.exists()) return null;
  const room = snap.val() as RoomDoc;
  if (room.status !== 'waiting' || room.black != null) return null;
  if (room.white.uid === uid) return null; // can't join own room

  await update(ref(getDb(), `rooms/${roomId}`), {
    black: { name: playerName, uid },
    status: 'playing',
  });
  return { color: 'black', whiteName: room.white.name, rulesetName: room.rulesetName };
}

export function listenRoom(
  roomId: string,
  callback: (doc: RoomDoc | null) => void,
): () => void {
  const roomRef = ref(getDb(), `rooms/${roomId}`);
  onValue(roomRef, snap => callback(snap.exists() ? (snap.val() as RoomDoc) : null));
  return () => off(roomRef);
}

export async function pushMove(
  roomId: string,
  newFen: string,
  moveCount: number,
  capturedByWhite: Piece[],
  capturedByBlack: Piece[],
  allMoves: SerializedMove[],
): Promise<void> {
  await update(ref(getDb(), `rooms/${roomId}`), {
    fen: newFen,
    moveCount,
    movesJson: JSON.stringify(allMoves),
    capturesByWhiteJson: JSON.stringify(capturedByWhite),
    capturesByBlackJson: JSON.stringify(capturedByBlack),
  });
}

export async function setRoomGameOver(
  roomId: string,
  gameOver: FirebaseGameOver,
): Promise<void> {
  await update(ref(getDb(), `rooms/${roomId}`), {
    gameOver,
    status: 'finished',
  });
}
