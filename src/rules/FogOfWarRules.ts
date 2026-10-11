import type { RuleSet } from './RuleSet';
import { StandardRules } from './StandardRules';
import { getLegalMoves } from '../core/MoveValidator';
import type { BoardState, Color } from '../core/types';
import type { GameContext } from '../core/MoveValidator';

export const FogOfWarRules: RuleSet = {
  name: 'Fog of War',
  description: '내 기물 시야 안만 보임',

  createInitialBoard: StandardRules.createInitialBoard,
  createInitialContext: StandardRules.createInitialContext,
  getLegalMoves: StandardRules.getLegalMoves,
  applyMove: StandardRules.applyMove,
  getGameStatus: StandardRules.getGameStatus,
  getAutoPromotion: () => null,

  getVisibleSquares(board: BoardState, color: Color, context: GameContext): ReadonlySet<string> {
    const visible = new Set<string>();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece?.color !== color) continue;
        visible.add(`${r}-${c}`);
        // 이동 가능한 칸
        getLegalMoves(board, r, c, context).forEach(([mr, mc]) => visible.add(`${mr}-${mc}`));
        // 폰은 이동 외 대각선(공격) 방향도 시야에 포함
        if (piece.type === 'P') {
          const dir = color === 'white' ? -1 : 1;
          for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) visible.add(`${nr}-${nc}`);
          }
        }
      }
    }
    return visible;
  },
};
