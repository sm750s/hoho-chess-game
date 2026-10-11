import type { BoardState, Piece } from './types';

function w(type: Piece['type']): Piece { return { type, color: 'white' }; }
function b(type: Piece['type']): Piece { return { type, color: 'black' }; }

export function createInitialBoard(): BoardState {
  return [
    [b('R'), b('N'), b('B'), b('Q'), b('K'), b('B'), b('N'), b('R')],
    [b('P'), b('P'), b('P'), b('P'), b('P'), b('P'), b('P'), b('P')],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [w('P'), w('P'), w('P'), w('P'), w('P'), w('P'), w('P'), w('P')],
    [w('R'), w('N'), w('B'), w('Q'), w('K'), w('B'), w('N'), w('R')],
  ];
}
