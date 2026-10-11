import { useState } from 'react';
import type { Color, Piece, PieceType } from '../core/types';
import { CapturedModal } from './CapturedModal';
import styles from './PlayerPanel.module.css';

const PIECE_ORDER: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];

const PIECE_SVG: Record<string, string> = {
  'white-Q': '/pieces/cburnett/wQ.svg', 'white-R': '/pieces/cburnett/wR.svg',
  'white-B': '/pieces/cburnett/wB.svg', 'white-N': '/pieces/cburnett/wN.svg',
  'white-P': '/pieces/cburnett/wP.svg',
  'black-Q': '/pieces/cburnett/bQ.svg', 'black-R': '/pieces/cburnett/bR.svg',
  'black-B': '/pieces/cburnett/bB.svg', 'black-N': '/pieces/cburnett/bN.svg',
  'black-P': '/pieces/cburnett/bP.svg',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  color: Color;
  isActive: boolean;
  isInCheck: boolean;
  capturedPieces: Piece[];
  materialAdvantage: number;
  opponentMaterial: number;
  name?: string;
  timeSeconds?: number;
}

export function PlayerPanel({ color, isActive, isInCheck, capturedPieces, materialAdvantage, opponentMaterial, name, timeSeconds }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const groups: Partial<Record<PieceType, number>> = {};
  for (const p of capturedPieces) {
    groups[p.type] = (groups[p.type] ?? 0) + 1;
  }

  const label = name ?? (color === 'white' ? '백' : '흑');
  const enemyColor: Color = color === 'white' ? 'black' : 'white';
  const showTimer = timeSeconds !== undefined && isFinite(timeSeconds);
  const isWarningTime = showTimer && timeSeconds! <= 60 && timeSeconds! > 30;
  const isLowTime = showTimer && timeSeconds! <= 30;

  const timerClass = isLowTime
    ? styles.timerLow
    : isWarningTime
      ? styles.timerWarning
      : '';

  return (
    <>
      <div className={`${styles.panel} ${isActive ? styles.active : ''}`}>
        <div className={styles.left}>
          <span className={`${styles.turnDot} ${styles[color]} ${isActive ? styles.pulsing : ''}`} />
          <span className={styles.name}>{label}</span>
          {isInCheck && <span className={styles.checkBadge}>체크!</span>}
          {!isInCheck && materialAdvantage > 0 && (
            <span className={styles.advantage}>+{materialAdvantage}</span>
          )}
        </div>
        <div className={styles.right}>
          {showTimer && (
            <span className={`${styles.timer} ${timerClass}`}>
              {formatTime(timeSeconds!)}
            </span>
          )}
          <div className={styles.captured}>
            {PIECE_ORDER.flatMap(type => {
              const count = groups[type] ?? 0;
              const src = PIECE_SVG[`${enemyColor}-${type}`];
              return Array.from({ length: count }, (_, i) => (
                <img
                  key={`${type}-${i}`}
                  src={src}
                  alt={`${enemyColor} ${type}`}
                  className={styles.capturedPiece}
                  draggable="false"
                />
              ));
            })}
          </div>
          {capturedPieces.length > 0 && (
            <button
              className={styles.infoBtn}
              onClick={() => setModalOpen(true)}
              aria-label="잡은 기물 상세 보기"
            >
              ⓘ
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <CapturedModal
          color={color}
          capturedPieces={capturedPieces}
          opponentMaterial={opponentMaterial}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
