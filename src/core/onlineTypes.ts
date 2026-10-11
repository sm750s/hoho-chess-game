import type { Color } from './types';

export interface OnlineGameProps {
  roomId: string;
  myColor: Color;
}

export interface SerializedMove {
  from: [number, number];
  to: [number, number];
  promotion?: string;
  notation: string;
}

export interface FirebaseGameOver {
  reason: string;
  winner: 'white' | 'black' | 'draw';
}

export interface RoomDoc {
  status: 'waiting' | 'playing' | 'finished';
  rulesetName: string;
  white: { name: string; uid: string };
  black: { name: string; uid: string } | null;
  fen: string;
  moveCount: number;
  movesJson: string;
  capturesByWhiteJson: string;
  capturesByBlackJson: string;
  gameOver: FirebaseGameOver | null;
  createdAt: number;
}
