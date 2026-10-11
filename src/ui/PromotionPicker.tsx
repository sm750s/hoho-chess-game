import type { Color, PieceType } from '../core/types';
import { Piece } from './Piece';
import styles from './PromotionPicker.module.css';

const OPTIONS: PieceType[] = ['Q', 'R', 'B', 'N'];
const NAMES: Record<PieceType, string> = { Q: '퀸', R: '룩', B: '비숍', N: '나이트', K: '', P: '', A: '아마존' };

interface Props {
  color: Color;
  onSelect: (type: PieceType) => void;
}

export function PromotionPicker({ color, onSelect }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <p className={styles.label}>프로모션 — 기물을 선택하세요</p>
        <div className={styles.options}>
          {OPTIONS.map(type => (
            <button
              key={type}
              className={`${styles.option} ${styles[color]}`}
              onClick={() => onSelect(type)}
              aria-label={`${color} ${NAMES[type]}`}
            >
              <span className={styles.pieceWrap}>
                <Piece piece={{ type, color }} />
              </span>
              <span className={styles.name}>{NAMES[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
