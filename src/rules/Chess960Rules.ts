import type { RuleSet } from './RuleSet';
import { StandardRules } from './StandardRules';
import type { BoardState, Piece, PieceType } from '../core/types';

function generateChess960Board(): BoardState {
  const back = new Array<PieceType | null>(8).fill(null);
  const open = () => back.reduce<number[]>((acc, v, i) => (v === null ? [...acc, i] : acc), []);
  const pick = (cols: number[]) => cols[Math.floor(Math.random() * cols.length)];

  back[pick([1, 3, 5, 7])] = 'B'; // dark-square bishop
  back[pick([0, 2, 4, 6])] = 'B'; // light-square bishop
  back[pick(open())] = 'Q';
  back[pick(open())] = 'N';
  back[pick(open())] = 'N';
  const last = open(); // remaining 3 → R K R
  back[last[0]] = 'R';
  back[last[1]] = 'K';
  back[last[2]] = 'R';

  const w = (i: number): Piece => ({ type: back[i]!, color: 'white' });
  const b = (i: number): Piece => ({ type: back[i]!, color: 'black' });

  return [
    Array.from({ length: 8 }, (_, i) => b(i)),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'black' as const })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'white' as const })),
    Array.from({ length: 8 }, (_, i) => w(i)),
  ];
}

export const Chess960Rules: RuleSet = {
  name: 'Chess960',
  description: '기물 배치가 매 판 랜덤',

  createInitialBoard: generateChess960Board,

  // 랜덤 배치에서 캐슬링 로직이 달라지므로 비활성화
  createInitialContext() {
    return {
      castlingRights: {
        white: { kingSide: false, queenSide: false },
        black: { kingSide: false, queenSide: false },
      },
      enPassantTarget: null,
    };
  },

  getLegalMoves: StandardRules.getLegalMoves,
  applyMove: StandardRules.applyMove,
  getGameStatus: StandardRules.getGameStatus,
  getAutoPromotion: () => null,
};
