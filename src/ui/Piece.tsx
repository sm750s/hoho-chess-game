import type { Piece as PieceData } from '../core/types';
import styles from './Piece.module.css';

const PIECE_SVG: Record<string, string> = {
  'white-K': '/pieces/cburnett/wK.svg',
  'white-Q': '/pieces/cburnett/wQ.svg',
  'white-R': '/pieces/cburnett/wR.svg',
  'white-B': '/pieces/cburnett/wB.svg',
  'white-N': '/pieces/cburnett/wN.svg',
  'white-P': '/pieces/cburnett/wP.svg',
  'white-A': '/pieces/cburnett/wQ.svg',
  'black-K': '/pieces/cburnett/bK.svg',
  'black-Q': '/pieces/cburnett/bQ.svg',
  'black-R': '/pieces/cburnett/bR.svg',
  'black-B': '/pieces/cburnett/bB.svg',
  'black-N': '/pieces/cburnett/bN.svg',
  'black-P': '/pieces/cburnett/bP.svg',
  'black-A': '/pieces/cburnett/bQ.svg',
};

export function Piece({ piece }: { piece: PieceData }) {
  const isAmazon = piece.type === 'A';
  const src = PIECE_SVG[`${piece.color}-${piece.type}`];

  return (
    <span
      data-piece="true"
      className={`${styles.piece} ${isAmazon ? styles.amazon : ''}`}
      aria-label={`${piece.color} ${piece.type}`}
    >
      <img src={src} alt="" draggable="false" className={styles.img} />
    </span>
  );
}
