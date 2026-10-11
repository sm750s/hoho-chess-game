import type { Color, PlayerNames } from '../core/types';
import styles from './GameOver.module.css';

export type GameOverReason = 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'timeout' | 'resign';

interface Props {
  status: GameOverReason;
  loser: Color;
  playerNames?: PlayerNames;
  moveCount?: number;
  onRestart?: () => void;
  onReplay?: () => void;
  onHome?: () => void;
}

const DRAW_STATUSES: ReadonlySet<GameOverReason> = new Set(['stalemate', 'fifty-move', 'repetition']);

const SUBTITLES: Record<GameOverReason, (winner: string, loser: string) => string> = {
  checkmate:    (w) => `${w}의 체크메이트`,
  stalemate:    ()  => '스테일메이트',
  'fifty-move': ()  => '50수 규칙 적용',
  repetition:   ()  => '3회 반복 포지션',
  timeout:      (_, l) => `${l} 시간 초과`,
  resign:       (_, l) => `${l} 항복`,
};

export function GameOver({ status, loser, playerNames, moveCount, onRestart, onReplay, onHome }: Props) {
  const isDraw = DRAW_STATUSES.has(status);
  const winner: Color = loser === 'white' ? 'black' : 'white';

  const winnerLabel = playerNames
    ? (winner === 'white' ? playerNames.white : playerNames.black)
    : (winner === 'white' ? '백' : '흑');
  const loserLabel = playerNames
    ? (loser === 'white' ? playerNames.white : playerNames.black)
    : (loser === 'white' ? '백' : '흑');

  const title = isDraw ? '무승부' : `${winnerLabel} 승리!`;
  const subtitle = SUBTITLES[status](winnerLabel, loserLabel);
  const resultClass = isDraw ? styles.draw : styles.win;

  const winnerPiece = `/pieces/cburnett/${winner === 'white' ? 'w' : 'b'}K.svg`;

  return (
    <div className={`${styles.overlay} ${resultClass}`}>
      <div className={styles.content}>
        <div className={styles.pieceRow}>
          {isDraw ? (
            <>
              <img src="/pieces/cburnett/wK.svg" alt="white king" className={styles.kingImg} />
              <img src="/pieces/cburnett/bK.svg" alt="black king" className={`${styles.kingImg} ${styles.kingFlipped}`} />
            </>
          ) : (
            <img src={winnerPiece} alt="winner king" className={styles.kingImg} />
          )}
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {moveCount !== undefined && (
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{moveCount}</span>
              <span className={styles.statLabel}>총 수</span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {onRestart && (
            <button className={styles.primaryBtn} onClick={onRestart}>
              새 게임
            </button>
          )}
          {(onReplay || onHome) && (
            <div className={styles.secondaryRow}>
              {onReplay && (
                <button className={styles.secondaryBtn} onClick={onReplay}>
                  ▶ 다시보기
                </button>
              )}
              {onHome && (
                <button className={styles.secondaryBtn} onClick={onHome}>
                  홈으로
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
