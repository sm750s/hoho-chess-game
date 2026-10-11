import type { Piece as PieceData } from '../core/types';
import styles from './Piece.module.css';

const SYMBOLS: Record<string, string> = {
  'white-K': '♔', 'white-Q': '♕', 'white-R': '♖',
  'white-B': '♗', 'white-N': '♘', 'white-P': '♙',
  'white-A': '♕',
  'black-K': '♚', 'black-Q': '♛', 'black-R': '♜',
  'black-B': '♝', 'black-N': '♞', 'black-P': '♟',
  'black-A': '♛',
};

export function Piece({ piece }: { piece: PieceData }) {
  const isAmazon = piece.type === 'A';
  return (
    <span
      data-piece="true"
      className={`${styles.piece} ${styles[piece.color]} ${isAmazon ? styles.amazon : ''}`}
      aria-label={`${piece.color} ${piece.type}`}
    >
      {SYMBOLS[`${piece.color}-${piece.type}`] ?? piece.type}
    </span>
  );
}
