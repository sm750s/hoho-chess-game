import type { BoardState, Color, PieceType } from '../core/types';
import type { GameContext, MoveResult, GameStatus } from '../core/MoveValidator';

export interface DropResult {
  board: BoardState;
  context: GameContext;
}

export interface RuleSet {
  readonly name: string;
  readonly description: string;

  createInitialBoard(): BoardState;
  createInitialContext(): GameContext;

  getLegalMoves(board: BoardState, row: number, col: number, context: GameContext): [number, number][];
  applyMove(board: BoardState, from: [number, number], to: [number, number], context: GameContext): MoveResult;
  getGameStatus(board: BoardState, turn: Color, context: GameContext): GameStatus;

  // null → 프로모션 선택 UI 표시, PieceType → 자동 프로모션
  getAutoPromotion(color: Color): PieceType | null;

  // Fog of War: 현재 플레이어가 볼 수 있는 칸 (없으면 전체 공개)
  getVisibleSquares?(board: BoardState, color: Color, context: GameContext): ReadonlySet<string>;

  // Crazyhouse: 패에서 기물을 놓을 수 있는 칸 목록
  getDropTargets?(board: BoardState, context: GameContext, pieceType: PieceType, color: Color): [number, number][];
  applyDrop?(board: BoardState, to: [number, number], pieceType: PieceType, color: Color, context: GameContext): DropResult;
}
