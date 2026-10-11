import type { BoardState, Color } from '../core/types';
import type { GameContext } from '../core/MoveValidator';
import type { RuleSet } from '../rules/RuleSet';
import { getBestMove } from '../ai/engine';

export function getHint(
  board: BoardState,
  turn: Color,
  context: GameContext,
  ruleset: RuleSet,
): { from: [number, number]; to: [number, number] } | null {
  const move = getBestMove(board, turn, context, ruleset, 'medium');
  if (!move || move === 'resign') return null;
  if (move.kind === 'drop') return null;
  return { from: move.from, to: move.to };
}
