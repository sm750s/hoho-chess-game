import type { Color, PlayerNames } from '../core/types';
import styles from './GameOver.module.css';

export type GameOverReason = 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'timeout' | 'resign';

interface Props {
  status: GameOverReason;
  loser: Color;
  playerNames?: PlayerNames;
  onRestart?: () => void;
  onReplay?: () => void;
}

const TITLES: Record<GameOverReason, string> = {
  checkmate:    '체크메이트!',
  stalemate:    '스테일메이트!',
  'fifty-move': '50수 규칙',
  repetition:   '3회 반복',
  timeout:      '시간 초과!',
  resign:       '항복 선언',
};

const DRAW_STATUSES: ReadonlySet<GameOverReason> = new Set(['stalemate', 'fifty-move', 'repetition']);

export function GameOver({ status, loser, playerNames, onRestart, onReplay }: Props) {
  const isDraw = DRAW_STATUSES.has(status);
  const winner: Color = loser === 'white' ? 'black' : 'white';
  const winnerLabel = playerNames
    ? (winner === 'white' ? playerNames.white : playerNames.black)
    : (winner === 'white' ? '백(White)' : '흑(Black)');
  const loserLabel = playerNames
    ? (loser === 'white' ? playerNames.white : playerNames.black)
    : (loser === 'white' ? '백(White)' : '흑(Black)');

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <p className={styles.title}>{TITLES[status]}</p>
        <p className={styles.subtitle}>
          {isDraw ? '무승부' : status === 'resign' ? `${loserLabel} 항복` : `${winnerLabel} 승리`}
        </p>
        <div className={styles.actions}>
          {onReplay && (
            <button className={styles.replayBtn} onClick={onReplay}>
              ▶ 다시보기
            </button>
          )}
          {onRestart && (
            <button className={styles.restartBtn} onClick={onRestart}>
              새 게임
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
