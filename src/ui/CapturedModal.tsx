import { useEffect } from 'react';
import type { Color, Piece, PieceType } from '../core/types';
import styles from './CapturedModal.module.css';

const PIECE_VALUE: Record<PieceType, number> = { Q: 9, R: 5, B: 3, N: 3, P: 1, K: 0, A: 12 };
const PIECE_ORDER: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];
const PIECE_NAMES: Record<PieceType, string> = { Q: '퀸', R: '룩', B: '비숍', N: '나이트', P: '폰', K: '', A: '아마존' };
const SYMBOLS: Record<string, string> = {
  'white-Q': '♕', 'white-R': '♖', 'white-B': '♗', 'white-N': '♘', 'white-P': '♙',
  'black-Q': '♛', 'black-R': '♜', 'black-B': '♝', 'black-N': '♞', 'black-P': '♟',
};

interface Props {
  color: Color;
  capturedPieces: Piece[];
  opponentMaterial: number;
  onClose: () => void;
}

export function CapturedModal({ color, capturedPieces, opponentMaterial, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const groups: Partial<Record<PieceType, number>> = {};
  for (const p of capturedPieces) groups[p.type] = (groups[p.type] ?? 0) + 1;

  const enemyColor: Color = color === 'white' ? 'black' : 'white';
  const totalMaterial = capturedPieces.reduce((s, p) => s + PIECE_VALUE[p.type], 0);
  const advantage = totalMaterial - opponentMaterial;
  const label = color === 'white' ? 'White' : 'Black';

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        {/* 헤더 */}
        <div className={styles.header}>
          <span className={`${styles.colorDot} ${styles[color]}`} />
          <h3 className={styles.title}>{label}의 잡은 기물</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {/* 기물 목록 */}
        <div className={styles.list}>
          {PIECE_ORDER.map(type => {
            const count = groups[type] ?? 0;
            const pts = PIECE_VALUE[type] * count;
            return (
              <div key={type} className={`${styles.row} ${count === 0 ? styles.zero : ''}`}>
                <div className={`${styles.chip} ${styles[enemyColor]}`}>
                  {SYMBOLS[`${enemyColor}-${type}`]}
                </div>
                <span className={styles.name}>{PIECE_NAMES[type]}</span>
                <span className={styles.count}>×{count}</span>
                <span className={styles.pts}>{count > 0 ? `${pts}점` : '—'}</span>
              </div>
            );
          })}
        </div>

        {/* 합계 요약 */}
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>내 획득 합계</span>
            <strong>{totalMaterial}점</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>상대 획득 합계</span>
            <strong>{opponentMaterial}점</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.resultRow} ${advantage > 0 ? styles.winning : advantage < 0 ? styles.losing : styles.equal}`}>
            <span>형세</span>
            <strong>
              {advantage > 0 ? `+${advantage}점 우세` : advantage < 0 ? `${Math.abs(advantage)}점 열세` : '균형'}
            </strong>
          </div>
        </div>

      </div>
    </div>
  );
}
