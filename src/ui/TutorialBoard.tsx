import { useMemo } from 'react';
import { getLegalMoves } from '../core/MoveValidator';
import { Square } from './Square';
import type { BoardState } from '../core/types';
import type { GameContext } from '../core/MoveValidator';
import type { TutorialStep } from '../tutorial/tutorialSteps';
import styles from './TutorialBoard.module.css';

interface Props {
  step: TutorialStep;
  board: BoardState;
  context: GameContext;
  inCheck: boolean;
  onMove: (from: [number, number], to: [number, number]) => void;
}

export function TutorialBoard({ step, board, context, inCheck, onMove }: Props) {
  const taskPiece = step.task?.piece ?? null;

  const legalMoves = useMemo<ReadonlySet<string>>(() => {
    if (!taskPiece) return new Set();
    const [r, c] = taskPiece;
    const moves = getLegalMoves(board, r, c, context);
    const validDests = step.task?.validDests;
    const filtered = validDests
      ? moves.filter(([mr, mc]) => validDests.some(([vr, vc]) => vr === mr && vc === mc))
      : moves;
    return new Set(filtered.map(([mr, mc]) => `${mr}-${mc}`));
  }, [board, context, step]);

  const attentionSet = useMemo(
    () => new Set((step.attentionSquares ?? []).map(([r, c]) => `${r}-${c}`)),
    [step],
  );

  function handleClick(row: number, col: number) {
    if (!taskPiece) return;
    const key = `${row}-${col}`;
    if (legalMoves.has(key)) {
      onMove(taskPiece, [row, col]);
    }
  }

  // Highlight the king's square in red when in check
  const kingSquare: string | null = useMemo(() => {
    if (!inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p?.type === 'K' && p.color === step.turn) return `${r}-${c}`;
      }
    }
    return null;
  }, [board, inCheck, step.turn]);

  return (
    <div className={styles.board}>
      {board.map((row, rowIndex) =>
        row.map((square, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isTaskPiece = taskPiece?.[0] === rowIndex && taskPiece?.[1] === colIndex;
          const isLegalMove = legalMoves.has(key);
          const isCapture = isLegalMove && square !== null;
          const isAttention = attentionSet.has(key) && !isLegalMove;
          const isInCheckSquare = key === kingSquare;

          return (
            <Square
              key={key}
              square={square}
              row={rowIndex}
              col={colIndex}
              isSelected={!!isTaskPiece}
              isLegalMove={isLegalMove}
              isCapture={isCapture}
              isClickable={isLegalMove}
              isDragSource={false}
              isAttention={isAttention || isInCheckSquare}
              onClick={() => handleClick(rowIndex, colIndex)}
              onPointerDown={() => {}}
            />
          );
        })
      )}
    </div>
  );
}
