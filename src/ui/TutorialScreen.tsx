import { useState, useEffect } from 'react';
import { applyMoveToBoard, promotePawn, isInCheck } from '../core/MoveValidator';
import type { GameContext } from '../core/MoveValidator';
import type { BoardState, Color, PieceType } from '../core/types';
import { tutorialSteps } from '../tutorial/tutorialSteps';
import { TutorialBoard } from './TutorialBoard';
import { TutorialPanel } from './TutorialPanel';
import { PromotionPicker } from './PromotionPicker';
import styles from './TutorialScreen.module.css';

interface Props {
  onExit: () => void;
}

export function TutorialScreen({ onExit }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [board, setBoard] = useState<BoardState>(() => tutorialSteps[0].board);
  const [context, setContext] = useState<GameContext>(() => tutorialSteps[0].context);
  const [promotionPending, setPromotionPending] = useState<{
    square: [number, number];
    color: Color;
  } | null>(null);
  const [completed, setCompleted] = useState(false);

  const step = tutorialSteps[stepIdx];

  // Reset board when step changes
  useEffect(() => {
    setBoard(tutorialSteps[stepIdx].board);
    setContext(tutorialSteps[stepIdx].context);
    setPromotionPending(null);
  }, [stepIdx]);

  function advance() {
    if (stepIdx + 1 >= tutorialSteps.length) {
      setCompleted(true);
    } else {
      setStepIdx(s => s + 1);
    }
  }

  function handleMove(from: [number, number], to: [number, number]) {
    const result = applyMoveToBoard(board, from, to, context);
    const nextCtx: GameContext = {
      castlingRights: result.castlingRights,
      enPassantTarget: result.enPassantTarget,
    };

    if (result.promotionSquare) {
      setBoard(result.board);
      setContext(nextCtx);
      setPromotionPending({ square: result.promotionSquare, color: step.turn });
      return;
    }

    setBoard(result.board);
    setContext(nextCtx);
    advance();
  }

  function handlePromotion(type: PieceType) {
    if (!promotionPending) return;
    const nextBoard = promotePawn(board, promotionPending.square, type, promotionPending.color);
    setBoard(nextBoard);
    setPromotionPending(null);
    advance();
  }

  if (completed) {
    return (
      <div className={styles.completedScreen}>
        <div className={styles.completedCard}>
          <div className={styles.completedIcon}>♔</div>
          <h2 className={styles.completedTitle}>튜토리얼 완료!</h2>
          <p className={styles.completedDesc}>
            체스의 기본 규칙을 모두 배웠습니다.<br />
            이제 실전 게임에 도전해 보세요!
          </p>
          <div className={styles.completedActions}>
            <button className={styles.primaryBtn} onClick={onExit}>게임 시작</button>
            <button className={styles.secondaryBtn} onClick={() => { setStepIdx(0); setCompleted(false); }}>
              다시 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inCheck = isInCheck(board, step.turn);

  return (
    <div className={styles.screen}>
      <div className={styles.layout}>
        <TutorialPanel
          step={step}
          stepIdx={stepIdx}
          total={tutorialSteps.length}
          onNext={advance}
          onExit={onExit}
        />
        <TutorialBoard
          key={stepIdx}
          step={step}
          board={board}
          context={context}
          inCheck={inCheck}
          onMove={handleMove}
        />
      </div>

      {promotionPending && (
        <PromotionPicker color={promotionPending.color} onSelect={handlePromotion} />
      )}
    </div>
  );
}
