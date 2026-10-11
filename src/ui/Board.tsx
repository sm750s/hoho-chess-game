import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  promotePawn, isInCheck,
  type GameContext,
} from '../core/MoveValidator';
import type { RuleSet } from '../rules/RuleSet';
import { Square } from './Square';
import { PromotionPicker } from './PromotionPicker';
import { GameOver } from './GameOver';
import { Piece } from './Piece';
import { PlayerPanel } from './PlayerPanel';
import { MoveHistory, type MoveEntry } from './MoveHistory';
import { sounds } from '../utils/sounds';
import { moveNotation, squareName } from '../utils/notation';
import { boardToFen, fenToBoard } from '../utils/fen';
import { getBestMove, type AiDifficulty } from '../ai/engine';
import { toggleTheme, getCurrentTheme } from '../utils/theme';
import { getHint } from '../utils/hint';
import { saveResult } from '../utils/records';
import { listenRoom, pushMove, setRoomGameOver } from '../firebase/room';
import type { BoardState, Color, Piece as PieceData, PieceType, PlayerNames } from '../core/types';
import type { TimeControl } from '../core/timeControl';
import type { OnlineGameProps, SerializedMove } from '../core/onlineTypes';
import styles from './Board.module.css';

// ── 타입 ─────────────────────────────────────────────────────────────────────

type GameOverReason = 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'timeout' | 'resign';
type GameOverState = { status: GameOverReason; loser: Color } | null;
interface SoundHint { isCastle: boolean; isCapture: boolean; }

interface HistorySnapshot {
  board: BoardState;
  turn: Color;
  context: GameContext;
  halfMoveClock: number;
  capturedByWhite: PieceData[];
  capturedByBlack: PieceData[];
  posHistory: Map<string, number>;
  whiteTime: number;
  blackTime: number;
}

interface HistoryEntry {
  notation: string;
  color: Color;
  from: [number, number];
  to: [number, number];
  snapshot: HistorySnapshot;
}

// ── 상수 ─────────────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<PieceType, number> = { Q: 9, R: 5, B: 3, N: 3, P: 1, K: 0, A: 12 };
const DRAG_THRESHOLD = 6;
const AI_COLOR: Color = 'black';

// ── 포지션 직렬화 (3회 반복 판정용) ──────────────────────────────────────────

function serializePosition(board: BoardState, turn: Color, ctx: GameContext): string {
  const b = board.flat().map(sq => sq ? `${sq.color[0]}${sq.type}` : '.').join('');
  const { white, black } = ctx.castlingRights;
  const cr = `${white.kingSide?'K':''}${white.queenSide?'Q':''}${black.kingSide?'k':''}${black.queenSide?'q':''}` || '-';
  const ep = ctx.enPassantTarget?.join('') ?? '-';
  return `${b}|${turn}|${cr}|${ep}`;
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<AiDifficulty, string> = { easy: '초급', medium: '중급', hard: '고급' };

export function Board({
  ruleset,
  aiMode = false,
  difficulty = 'medium',
  playerNames,
  timeControl,
  onlineGame,
  onExit,
}: {
  ruleset: RuleSet;
  aiMode?: boolean;
  difficulty?: AiDifficulty;
  playerNames: PlayerNames;
  timeControl: TimeControl;
  onlineGame?: OnlineGameProps;
  onExit?: () => void;
}) {
  const [board, setBoard] = useState(() => ruleset.createInitialBoard());
  const [turn, setTurn] = useState<Color>('white');
  const [context, setContext] = useState<GameContext>(() => ruleset.createInitialContext());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoveSet, setLegalMoveSet] = useState<ReadonlySet<string>>(new Set());
  const [promotionPending, setPromotionPending] = useState<{ square: [number, number]; color: Color } | null>(null);
  const [gameOver, setGameOver] = useState<GameOverState>(null);
  const [halfMoveClock, setHalfMoveClock] = useState(0);
  const [capturedByWhite, setCapturedByWhite] = useState<PieceData[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<PieceData[]>([]);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dropPiece, setDropPiece] = useState<PieceType | null>(null);
  const [moveHistory, setMoveHistory] = useState<HistoryEntry[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [fenCopied, setFenCopied] = useState(false);
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [fullMoveBase, setFullMoveBase] = useState(1);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('chess-sound') !== 'off');
  const [theme, setTheme] = useState(getCurrentTheme);
  const [whiteTime, setWhiteTime] = useState(timeControl.seconds);
  const [blackTime, setBlackTime] = useState(timeControl.seconds);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [hintMove, setHintMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [fenExpanded, setFenExpanded] = useState(false);
  const [resignConfirm, setResignConfirm] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────

  const boardRef = useRef<HTMLDivElement>(null);
  const posHistoryRef = useRef(
    new Map([[serializePosition(ruleset.createInitialBoard(), 'white', ruleset.createInitialContext()), 1]])
  );
  const dragRef = useRef<{
    from: [number, number]; startX: number; startY: number; active: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const pointerDownSquareRef = useRef<[number, number] | null>(null);
  const promotionMoveRef = useRef<{
    from: [number, number]; to: [number, number];
    preMoveBoard: BoardState; snapshot: HistorySnapshot;
  } | null>(null);
  const savedResultRef = useRef(false);

  // 애니메이션: 이동 전 from 위치의 DOMRect 저장
  const animFromRectRef = useRef<DOMRect | null>(null);
  const animToRef = useRef<[number, number] | null>(null);

  // 온라인 모드
  const onlineMoveCountRef = useRef(0);
  const onlineAllMovesRef = useRef<SerializedMove[]>([]);
  const onlineGameOverWrittenRef = useRef(false);

  // 문서 레벨 핸들러가 항상 최신 상태에 접근할 수 있도록
  const S = useRef({
    board, turn, context, selected, legalMoveSet, gameOver, promotionPending,
    halfMoveClock, dropPiece, capturedByWhite, capturedByBlack, isAiThinking,
    whiteTime, blackTime, moveHistoryLength: moveHistory.length,
  });
  S.current = {
    board, turn, context, selected, legalMoveSet, gameOver, promotionPending,
    halfMoveClock, dropPiece, capturedByWhite, capturedByBlack, isAiThinking,
    whiteTime, blackTime, moveHistoryLength: moveHistory.length,
  };

  // ── 스냅샷 생성 헬퍼 ──────────────────────────────────────────────────────

  function snapshot(): HistorySnapshot {
    const { board: b, turn: t, context: ctx, halfMoveClock: hmc, capturedByWhite: cbw, capturedByBlack: cbb, whiteTime: wt, blackTime: bt } = S.current;
    return {
      board: b, turn: t, context: ctx, halfMoveClock: hmc,
      capturedByWhite: [...cbw], capturedByBlack: [...cbb],
      posHistory: new Map(posHistoryRef.current),
      whiteTime: wt, blackTime: bt,
    };
  }

  // ── 턴 전환 + 게임 종료 판정 + 효과음 ────────────────────────────────────

  function advanceTurn(
    nextBoard: BoardState,
    nextCtx: GameContext,
    nextTurn: Color,
    newClock: number,
    hint: SoundHint,
  ) {
    setTurn(nextTurn);
    setHalfMoveClock(newClock);

    if (newClock >= 100) {
      sounds.draw();
      setGameOver({ status: 'fifty-move', loser: nextTurn });
      return;
    }

    const ph = posHistoryRef.current;
    const posKey = serializePosition(nextBoard, nextTurn, nextCtx);
    ph.set(posKey, (ph.get(posKey) ?? 0) + 1);
    if ((ph.get(posKey) ?? 0) >= 3) {
      sounds.draw();
      setGameOver({ status: 'repetition', loser: nextTurn });
      return;
    }

    const gs = ruleset.getGameStatus(nextBoard, nextTurn, nextCtx);
    if (gs === 'checkmate') { sounds.gameOver(); setGameOver({ status: 'checkmate', loser: nextTurn }); return; }
    if (gs === 'stalemate') { sounds.draw();    setGameOver({ status: 'stalemate', loser: nextTurn }); return; }

    if (isInCheck(nextBoard, nextTurn)) sounds.check();
    else if (hint.isCastle)            sounds.castle();
    else if (hint.isCapture)           sounds.capture();
    else                               sounds.move();
  }

  // ── 이동 실행 (클릭·드래그 공통) ───────────────────────────────────────────

  function executeMove(from: [number, number], to: [number, number], skipAnim = false) {
    const { board: b, context: ctx, turn: t, gameOver: go, promotionPending: pp, halfMoveClock: hmc } = S.current;
    if (go || pp) return;

    const movingPiece = b[from[0]][from[1]];
    if (!movingPiece) return;
    if (onlineGame && t !== onlineGame.myColor) return;

    // 애니메이션용 from 위치 캡처 (DOM 업데이트 전)
    if (!skipAnim && boardRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const fromSquare = boardRef.current.children[from[0] * 8 + from[1]] as HTMLElement;
      const pieceEl = fromSquare?.querySelector('[data-piece]') as HTMLElement | null;
      animFromRectRef.current = pieceEl?.getBoundingClientRect() ?? null;
      animToRef.current = to;
    } else {
      animFromRectRef.current = null;
      animToRef.current = null;
    }

    const snap = snapshot();
    const result = ruleset.applyMove(b, from, to, ctx);
    const nextCtx: GameContext = result.context ?? { castlingRights: result.castlingRights, enPassantTarget: result.enPassantTarget };
    const nextTurn: Color = t === 'white' ? 'black' : 'white';
    const newClock = result.resetsHalfMoveClock ? 0 : hmc + 1;

    setBoard(result.board);
    setContext(nextCtx);
    setSelected(null);
    setLegalMoveSet(new Set());
    setHintMove(null);

    if (result.capturedPiece) {
      const cp = result.capturedPiece;
      if (t === 'white') setCapturedByWhite(prev => [...prev, cp]);
      else               setCapturedByBlack(prev => [...prev, cp]);
    }

    const isCastle = movingPiece.type === 'K' && Math.abs(to[1] - from[1]) === 2;

    if (result.promotionSquare) {
      const autoType = ruleset.getAutoPromotion(t) ?? (aiMode && t === AI_COLOR ? 'Q' : null) ?? (onlineGame ? 'Q' : null);
      if (autoType !== null) {
        const nextBoard = promotePawn(result.board, result.promotionSquare, autoType, t);
        const notation = moveNotation(b, from, to, autoType);
        setMoveHistory(h => [...h, { notation, color: t, from, to, snapshot: snap }]);
        setBoard(nextBoard);
        setHalfMoveClock(newClock);
        sounds.promotion();
        advanceTurn(nextBoard, nextCtx, nextTurn, newClock, { isCastle, isCapture: result.capturedPiece !== null });
        if (onlineGame) {
          onlineMoveCountRef.current += 1;
          const newMove: SerializedMove = { from, to, notation, promotion: autoType };
          const allMoves = [...onlineAllMovesRef.current, newMove];
          onlineAllMovesRef.current = allMoves;
          const newFen = boardToFen(nextBoard, nextTurn, nextCtx, newClock, fullMoveBase + Math.floor((moveHistory.length + 1) / 2));
          const newCbw = t === 'white' && result.capturedPiece ? [...S.current.capturedByWhite, result.capturedPiece] : S.current.capturedByWhite;
          const newCbb = t === 'black' && result.capturedPiece ? [...S.current.capturedByBlack, result.capturedPiece] : S.current.capturedByBlack;
          pushMove(onlineGame.roomId, newFen, onlineMoveCountRef.current, newCbw, newCbb, allMoves).catch(console.error);
        }
        return;
      }
      promotionMoveRef.current = { from, to, preMoveBoard: b, snapshot: snap };
      setHalfMoveClock(newClock);
      setPromotionPending({ square: result.promotionSquare, color: t });
      return;
    }

    const notation = moveNotation(b, from, to);
    setMoveHistory(h => [...h, { notation, color: t, from, to, snapshot: snap }]);
    advanceTurn(result.board, nextCtx, nextTurn, newClock, { isCastle, isCapture: result.capturedPiece !== null });
    if (onlineGame) {
      onlineMoveCountRef.current += 1;
      const newMove: SerializedMove = { from, to, notation };
      const allMoves = [...onlineAllMovesRef.current, newMove];
      onlineAllMovesRef.current = allMoves;
      const newFen = boardToFen(result.board, nextTurn, nextCtx, newClock, fullMoveBase + Math.floor((moveHistory.length + 1) / 2));
      const newCbw = t === 'white' && result.capturedPiece ? [...S.current.capturedByWhite, result.capturedPiece] : S.current.capturedByWhite;
      const newCbb = t === 'black' && result.capturedPiece ? [...S.current.capturedByBlack, result.capturedPiece] : S.current.capturedByBlack;
      pushMove(onlineGame.roomId, newFen, onlineMoveCountRef.current, newCbw, newCbb, allMoves).catch(console.error);
    }
  }

  const executeMoveRef = useRef(executeMove);
  executeMoveRef.current = executeMove;

  // ── Crazyhouse 드롭 ────────────────────────────────────────────────────────

  function executeDropMove(to: [number, number]) {
    const { board: b, context: ctx, turn: t, gameOver: go, promotionPending: pp, halfMoveClock: hmc, dropPiece: dp } = S.current;
    if (go || pp || !dp || !ruleset.applyDrop) return;

    animFromRectRef.current = null;
    animToRef.current = null;

    const snap = snapshot();
    const notation = `@${squareName(to[0], to[1])}`;
    const result = ruleset.applyDrop(b, to, dp, t, ctx);
    const nextTurn: Color = t === 'white' ? 'black' : 'white';

    setBoard(result.board);
    setContext(result.context);
    setDropPiece(null);
    setSelected(null);
    setLegalMoveSet(new Set());
    setHintMove(null);
    // Use dummy from for drops
    setMoveHistory(h => [...h, { notation, color: t, from: to, to, snapshot: snap }]);

    advanceTurn(result.board, result.context, nextTurn, hmc + 1, { isCastle: false, isCapture: false });
  }

  function executeAiDrop(pieceType: PieceType, to: [number, number]) {
    const { board: b, context: ctx, turn: t, gameOver: go, promotionPending: pp, halfMoveClock: hmc } = S.current;
    if (go || pp || !ruleset.applyDrop) return;

    animFromRectRef.current = null;
    animToRef.current = null;

    const snap = snapshot();
    const notation = `@${squareName(to[0], to[1])}`;
    const result = ruleset.applyDrop(b, to, pieceType, t, ctx);
    const nextTurn: Color = t === 'white' ? 'black' : 'white';

    setBoard(result.board);
    setContext(result.context);
    setDropPiece(null);
    setSelected(null);
    setLegalMoveSet(new Set());
    setHintMove(null);
    setMoveHistory(h => [...h, { notation, color: t, from: to, to, snapshot: snap }]);

    advanceTurn(result.board, result.context, nextTurn, hmc + 1, { isCastle: false, isCapture: false });
  }
  const executeAiDropRef = useRef(executeAiDrop);
  executeAiDropRef.current = executeAiDrop;

  function handleHandPieceClick(pieceType: PieceType) {
    const { turn: t, gameOver: go, context: ctx, dropPiece: dp } = S.current;
    if (go || !ruleset.getDropTargets) return;
    if (dp === pieceType) {
      setDropPiece(null);
      setSelected(null);
      setLegalMoveSet(new Set());
      return;
    }
    const targets = ruleset.getDropTargets(board, ctx, pieceType, t);
    setDropPiece(pieceType);
    setSelected(null);
    setLegalMoveSet(new Set(targets.map(([r, c]) => `${r}-${c}`)));
  }

  // ── 효과음 뮤트 동기화 ────────────────────────────────────────────────────

  useEffect(() => {
    sounds.setMuted(!soundOn);
    localStorage.setItem('chess-sound', soundOn ? 'on' : 'off');
  }, [soundOn]);

  useEffect(() => { setResignConfirm(false); }, [turn]);

  // ── 기물 이동 애니메이션 ──────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!animFromRectRef.current || !animToRef.current || !boardRef.current) return;
    const to = animToRef.current;
    const toSquare = boardRef.current.children[to[0] * 8 + to[1]] as HTMLElement;
    const pieceEl = toSquare?.querySelector('[data-piece]') as HTMLElement | null;
    if (!pieceEl) { animFromRectRef.current = null; animToRef.current = null; return; }

    const fromRect = animFromRectRef.current;
    const toRect = pieceEl.getBoundingClientRect();
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;

    animFromRectRef.current = null;
    animToRef.current = null;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    pieceEl.style.transition = 'none';
    pieceEl.style.transform = `translate(${dx}px, ${dy}px)`;

    requestAnimationFrame(() => {
      pieceEl.style.transition = 'transform 150ms ease';
      pieceEl.style.transform = '';
      pieceEl.addEventListener('transitionend', () => {
        pieceEl.style.transition = '';
        pieceEl.style.transform = '';
      }, { once: true });
    });
  }, [board]);

  // ── 온라인: Firebase 구독 ─────────────────────────────────────────────────

  useEffect(() => {
    if (!onlineGame) return;
    const unsub = listenRoom(onlineGame.roomId, (doc) => {
      if (!doc) return;
      const { moveCount } = doc;

      // 내 이동의 에코이거나 초기 상태면 게임오버 체크만 하고 스킵
      if (moveCount <= onlineMoveCountRef.current) {
        if (doc.gameOver && !S.current.gameOver) {
          const fo = doc.gameOver;
          const loser: Color = fo.winner === 'white' ? 'black' : fo.winner === 'black' ? 'white' : 'white';
          setGameOver({ status: fo.reason as GameOverReason, loser });
        }
        return;
      }

      const fenResult = fenToBoard(doc.fen);
      if (!fenResult) return;

      const movesData: SerializedMove[] = JSON.parse(doc.movesJson || '[]');
      const lastMoveData = movesData.length > 0 ? movesData[movesData.length - 1] : null;

      // 스냅샷은 상태 변경 전에 캡처
      const snap = snapshot();
      const movedColor: Color = fenResult.turn === 'white' ? 'black' : 'white';

      setBoard(fenResult.board);
      setTurn(fenResult.turn);
      setContext(fenResult.context);
      setHalfMoveClock(fenResult.halfMoveClock);
      setSelected(null);
      setLegalMoveSet(new Set());
      setHintMove(null);

      const cbw: PieceData[] = JSON.parse(doc.capturesByWhiteJson || '[]');
      const cbb: PieceData[] = JSON.parse(doc.capturesByBlackJson || '[]');
      setCapturedByWhite(cbw);
      setCapturedByBlack(cbb);

      if (lastMoveData && moveCount > 0) {
        setMoveHistory(h => [...h, {
          notation: lastMoveData.notation,
          color: movedColor,
          from: lastMoveData.from,
          to: lastMoveData.to,
          snapshot: snap,
        }]);

        const isCheckNow = isInCheck(fenResult.board, fenResult.turn);
        const isCastleMove = lastMoveData.notation.startsWith('O-O');
        const isCaptureMove = lastMoveData.notation.includes('x');
        if (isCheckNow)       sounds.check();
        else if (isCastleMove) sounds.castle();
        else if (isCaptureMove) sounds.capture();
        else                   sounds.move();
      }

      const posKey = serializePosition(fenResult.board, fenResult.turn, fenResult.context);
      posHistoryRef.current.set(posKey, (posHistoryRef.current.get(posKey) ?? 0) + 1);

      onlineMoveCountRef.current = moveCount;
      onlineAllMovesRef.current = movesData;

      if (doc.gameOver && !S.current.gameOver) {
        const fo = doc.gameOver;
        const loser: Color = fo.winner === 'white' ? 'black' : fo.winner === 'black' ? 'white' : 'white';
        setGameOver({ status: fo.reason as GameOverReason, loser });
      }
    });
    return unsub;
  }, [onlineGame?.roomId]);

  // ── 온라인: 게임 종료 Firebase 기록 ──────────────────────────────────────

  useEffect(() => {
    if (!gameOver || !onlineGame || onlineGameOverWrittenRef.current) return;
    onlineGameOverWrittenRef.current = true;
    const isDraw = ['stalemate', 'fifty-move', 'repetition'].includes(gameOver.status);
    const winner = isDraw ? 'draw' : gameOver.loser === 'white' ? 'black' : 'white';
    setRoomGameOver(onlineGame.roomId, { reason: gameOver.status, winner }).catch(console.error);
  }, [gameOver]);

  // ── 드래그 (document 레벨 포인터 이벤트) ──────────────────────────────────

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
        d.active = true;
      }
      if (d.active) setGhostPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.active) {
        suppressClickRef.current = true;
        const rect = boardRef.current?.getBoundingClientRect();
        if (rect) {
          const col = Math.floor((e.clientX - rect.left) / (rect.width / 8));
          const row = Math.floor((e.clientY - rect.top) / (rect.height / 8));
          if (row >= 0 && row < 8 && col >= 0 && col < 8 && S.current.legalMoveSet.has(`${row}-${col}`)) {
            executeMoveRef.current(d.from, [row, col], true);
          }
        }
        setSelected(null);
        setLegalMoveSet(new Set());
      }
      dragRef.current = null;
      setGhostPos(null);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  // ── AI 자동 이동 ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!aiMode || turn !== AI_COLOR || gameOver || promotionPending || replayIndex !== null) return;
    let cancelled = false;
    setIsAiThinking(true);
    const timer = setTimeout(() => {
      if (cancelled) return;
      const { board: b, context: ctx, turn: t, gameOver: go, promotionPending: pp } = S.current;
      if (go || pp || t !== AI_COLOR) { setIsAiThinking(false); return; }
      const move = getBestMove(b, AI_COLOR, ctx, ruleset, difficulty, S.current.moveHistoryLength);
      if (move === 'resign') {
        setGameOver({ status: 'resign', loser: AI_COLOR });
      } else if (move) {
        if (move.kind === 'drop') executeAiDropRef.current(move.pieceType, move.to);
        else executeMoveRef.current(move.from, move.to);
      }
      setIsAiThinking(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); setIsAiThinking(false); };
  }, [turn, aiMode, gameOver, promotionPending, replayIndex]);

  // ── 체스 타이머 ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameOver || !isFinite(timeControl.seconds) || replayIndex !== null) return;
    const interval = setInterval(() => {
      const { turn: t, gameOver: go } = S.current;
      if (go) return;
      if (t === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            queueMicrotask(() => { if (!S.current.gameOver) setGameOver({ status: 'timeout', loser: 'white' }); });
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            queueMicrotask(() => { if (!S.current.gameOver) setGameOver({ status: 'timeout', loser: 'black' }); });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, replayIndex]);

  // ── 전적 기록 자동 저장 ───────────────────────────────────────────────────

  useEffect(() => {
    if (!gameOver || savedResultRef.current) return;
    if (playerNames.white !== '백' || playerNames.black !== '흑') {
      savedResultRef.current = true;
      const isDraw = ['stalemate', 'fifty-move', 'repetition'].includes(gameOver.status);
      saveResult({
        white: playerNames.white,
        black: playerNames.black,
        result: isDraw ? 'draw' : (gameOver.loser === 'white' ? 'black' : 'white'),
        date: new Date().toISOString(),
        ruleset: ruleset.name,
      });
    }
  }, [gameOver]);

  // ── 리플레이 자동 재생 ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!replayPlaying || replayIndex === null || replayIndex >= moveHistory.length) {
      if (replayPlaying) setReplayPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setReplayIndex(prev => (prev !== null ? prev + 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [replayPlaying, replayIndex, moveHistory.length]);

  // ── 이벤트 핸들러 ─────────────────────────────────────────────────────────

  function handlePointerDown(row: number, col: number, e: React.PointerEvent) {
    if (replayIndex !== null) return;
    const { board: b, turn: t, context: ctx, gameOver: go, promotionPending: pp, dropPiece: dp, isAiThinking: ai } = S.current;
    if (go || pp || ai) return;
    const piece = b[row][col];
    if (!piece || piece.color !== t) return;
    if (aiMode && t === AI_COLOR) return;
    if (onlineGame && t !== onlineGame.myColor) return;

    if (dp) setDropPiece(null);

    dragRef.current = { from: [row, col], startX: e.clientX, startY: e.clientY, active: false };
    pointerDownSquareRef.current = [row, col];
    setSelected([row, col]);
    setLegalMoveSet(new Set(ruleset.getLegalMoves(b, row, col, ctx).map(([r, c]) => `${r}-${c}`)));
  }

  function handleSquareClick(row: number, col: number) {
    if (replayIndex !== null) return;
    const fromPointerDown =
      pointerDownSquareRef.current?.[0] === row &&
      pointerDownSquareRef.current?.[1] === col;
    pointerDownSquareRef.current = null;

    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    const { board: b, turn: t, context: ctx, gameOver: go, promotionPending: pp, selected: sel, legalMoveSet: lms, dropPiece: dp, isAiThinking: ai } = S.current;
    if (go || pp || ai) return;
    if (aiMode && t === AI_COLOR) return;
    if (onlineGame && t !== onlineGame.myColor) return;

    if (dp && lms.has(`${row}-${col}`)) { executeDropMove([row, col]); return; }
    if (sel && lms.has(`${row}-${col}`)) { executeMove(sel, [row, col]); return; }

    const piece = b[row][col];
    if (piece && piece.color === t) {
      if (fromPointerDown) return;
      if (sel?.[0] === row && sel?.[1] === col) {
        setSelected(null); setLegalMoveSet(new Set());
      } else {
        setSelected([row, col]);
        setLegalMoveSet(new Set(ruleset.getLegalMoves(b, row, col, ctx).map(([r, c]) => `${r}-${c}`)));
      }
      return;
    }
    setSelected(null); setLegalMoveSet(new Set());
  }

  function handlePromotion(type: PieceType) {
    if (!promotionPending) return;
    const pmr = promotionMoveRef.current;
    const notation = pmr ? moveNotation(pmr.preMoveBoard, pmr.from, pmr.to, type) : `=${type}`;
    const snap = pmr?.snapshot ?? snapshot();
    const from = pmr?.from ?? [0, 0] as [number, number];
    const to = pmr?.to ?? [0, 0] as [number, number];
    promotionMoveRef.current = null;

    const nextBoard = promotePawn(board, promotionPending.square, type, promotionPending.color);
    const nextTurn: Color = turn === 'white' ? 'black' : 'white';
    setBoard(nextBoard);
    setPromotionPending(null);
    setMoveHistory(h => [...h, { notation, color: promotionPending.color, from, to, snapshot: snap }]);
    sounds.promotion();
    advanceTurn(nextBoard, context, nextTurn, halfMoveClock, { isCastle: false, isCapture: false });
  }

  function handleUndo() {
    if (replayIndex !== null) return;
    const count = aiMode ? Math.min(2, moveHistory.length) : Math.min(1, moveHistory.length);
    if (count === 0) return;
    const entry = moveHistory[moveHistory.length - count];
    const { board: b, turn: t, context: ctx, halfMoveClock: hmc, capturedByWhite: cbw, capturedByBlack: cbb, posHistory, whiteTime: wt, blackTime: bt } = entry.snapshot;

    setBoard(b);
    setTurn(t);
    setContext(ctx);
    setHalfMoveClock(hmc);
    setCapturedByWhite(cbw);
    setCapturedByBlack(cbb);
    posHistoryRef.current = new Map(posHistory);
    setMoveHistory(h => h.slice(0, -count));
    setGameOver(null);
    setSelected(null);
    setLegalMoveSet(new Set());
    setDropPiece(null);
    setPromotionPending(null);
    promotionMoveRef.current = null;
    setHintMove(null);
    if (isFinite(timeControl.seconds)) {
      setWhiteTime(wt);
      setBlackTime(bt);
    }
  }

  function handleRestart() {
    const initialBoard = ruleset.createInitialBoard();
    const initialContext = ruleset.createInitialContext();
    setBoard(initialBoard);
    setTurn('white');
    setContext(initialContext);
    setSelected(null);
    setLegalMoveSet(new Set());
    setPromotionPending(null);
    setGameOver(null);
    setHalfMoveClock(0);
    setDropPiece(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setMoveHistory([]);
    setIsAiThinking(false);
    setFullMoveBase(1);
    setFenInput('');
    setFenError(null);
    setWhiteTime(timeControl.seconds);
    setBlackTime(timeControl.seconds);
    setHintsRemaining(3);
    setHintMove(null);
    setReplayIndex(null);
    setReplayPlaying(false);
    promotionMoveRef.current = null;
    savedResultRef.current = false;
    posHistoryRef.current = new Map([[serializePosition(initialBoard, 'white', initialContext), 1]]);
  }

  async function handleCopyFen() {
    await navigator.clipboard.writeText(fen).catch(() => {});
    setFenCopied(true);
    setTimeout(() => setFenCopied(false), 1500);
  }

  function handleLoadFen() {
    const trimmed = fenInput.trim();
    if (!trimmed) return;
    const result = fenToBoard(trimmed);
    if (!result) {
      setFenError('FEN 형식이 올바르지 않습니다');
      return;
    }
    setBoard(result.board);
    setTurn(result.turn);
    setContext(result.context);
    setHalfMoveClock(result.halfMoveClock);
    setFullMoveBase(result.fullMove);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setMoveHistory([]);
    setGameOver(null);
    setSelected(null);
    setLegalMoveSet(new Set());
    setDropPiece(null);
    setPromotionPending(null);
    setIsAiThinking(false);
    setWhiteTime(timeControl.seconds);
    setBlackTime(timeControl.seconds);
    setHintMove(null);
    setReplayIndex(null);
    setReplayPlaying(false);
    promotionMoveRef.current = null;
    posHistoryRef.current = new Map([[serializePosition(result.board, result.turn, result.context), 1]]);
    setFenInput('');
    setFenError(null);
  }

  function handleHint() {
    if (hintsRemaining <= 0 || gameOver || isAiThinking || replayIndex !== null) return;
    if (aiMode && turn === AI_COLOR) return;
    const move = getHint(board, turn, context, ruleset);
    if (move) {
      setHintMove({ from: move.from, to: move.to });
      setHintsRemaining(h => h - 1);
    }
  }

  // ── 리플레이 컨트롤 ────────────────────────────────────────────────────────

  function handleReplayFirst()  { setReplayPlaying(false); setReplayIndex(0); }
  function handleReplayPrev()   { setReplayPlaying(false); setReplayIndex(i => i !== null ? Math.max(0, i - 1) : null); }
  function handleReplayNext()   { setReplayPlaying(false); setReplayIndex(i => i !== null ? Math.min(moveHistory.length, i + 1) : null); }
  function handleReplayLast()   { setReplayPlaying(false); setReplayIndex(moveHistory.length); }
  function handleReplayToggle() { setReplayPlaying(p => !p); }
  function handleReplayExit()   { setReplayPlaying(false); setReplayIndex(null); }

  function handleResign() {
    setResignConfirm(false);
    sounds.gameOver();
    setGameOver({ status: 'resign', loser: turn });
  }

  // ── 렌더링 계산 ───────────────────────────────────────────────────────────

  const inCheck = !gameOver && isInCheck(board, turn);
  const whiteMat = capturedByWhite.reduce((s, p) => s + PIECE_VALUE[p.type], 0);
  const blackMat = capturedByBlack.reduce((s, p) => s + PIECE_VALUE[p.type], 0);
  const visibleSquares = ruleset.getVisibleSquares?.(board, turn, context) ?? null;
  const hand = context.hand ?? null;

  const dragPiece = (ghostPos && dragRef.current)
    ? board[dragRef.current.from[0]][dragRef.current.from[1]]
    : null;

  const fullMove = fullMoveBase + Math.floor(moveHistory.length / 2);
  const fen = boardToFen(board, turn, context, halfMoveClock, fullMove);

  const displayBoard = replayIndex !== null && replayIndex < moveHistory.length
    ? moveHistory[replayIndex].snapshot.board
    : board;

  const liveLastMove = moveHistory.length > 0
    ? { from: moveHistory[moveHistory.length - 1].from, to: moveHistory[moveHistory.length - 1].to }
    : null;
  const replayLastMove = replayIndex !== null && replayIndex > 0
    ? { from: moveHistory[replayIndex - 1].from, to: moveHistory[replayIndex - 1].to }
    : null;
  const lastMoveHighlight = replayIndex !== null ? replayLastMove : liveLastMove;

  const historyActiveIndex = replayIndex !== null
    ? (replayIndex > 0 ? replayIndex - 1 : -1)
    : (moveHistory.length > 0 ? moveHistory.length - 1 : -1);

  const canUndo = !onlineGame && replayIndex === null && (aiMode ? moveHistory.length >= 2 : moveHistory.length >= 1) && !isAiThinking;

  const canHint = replayIndex === null && !gameOver && hintsRemaining > 0 && !isAiThinking
    && !(aiMode && turn === AI_COLOR);

  const canResign = !gameOver && replayIndex === null && !isAiThinking
    && moveHistory.length >= 1 && !(aiMode && turn === AI_COLOR);

  const displayHistory: MoveEntry[] = moveHistory.map(e => ({ notation: e.notation, color: e.color }));

  return (
    <div className={styles.outerLayout}>
      {/* ── 보드 영역 ────────────────────────────────────────────────────── */}
      <div className={styles.wrapper}>
        {onExit && (
          <button className={styles.homeBtn} onClick={onExit} aria-label="홈으로">← 홈</button>
        )}

        {/* 흑 패널 */}
        <PlayerPanel
          color="black"
          isActive={!gameOver && turn === 'black' && replayIndex === null}
          isInCheck={turn === 'black' && inCheck}
          capturedPieces={capturedByBlack}
          materialAdvantage={Math.max(0, blackMat - whiteMat)}
          opponentMaterial={whiteMat}
          name={playerNames.black}
          timeSeconds={isFinite(timeControl.seconds) ? blackTime : undefined}
        />

        {/* Crazyhouse 흑 패 */}
        {hand && (
          <div className={`${styles.handPanel} ${turn !== 'black' || gameOver ? styles.handPanelInactive : ''}`}>
            <span className={styles.handLabel}>패</span>
            {hand.black.length === 0
              ? <span className={styles.handEmpty}>없음</span>
              : hand.black.map((pt, i) => (
                  <button
                    key={i}
                    className={`${styles.handPiece} ${dropPiece === pt && turn === 'black' ? styles.handPieceSelected : ''}`}
                    onClick={() => { if (turn === 'black' && !gameOver) handleHandPieceClick(pt); }}
                    disabled={turn !== 'black' || !!gameOver}
                  >
                    <Piece piece={{ type: pt, color: 'black' }} />
                  </button>
                ))
            }
          </div>
        )}

        {/* 보드 */}
        <div className={`${styles.board} ${!gameOver && replayIndex === null ? styles[`turn_${turn}`] : ''}`} ref={boardRef}>
          {displayBoard.map((row, rowIndex) =>
            row.map((square, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const isSelected = replayIndex === null && selected?.[0] === rowIndex && selected?.[1] === colIndex;
              const isLegalMove = replayIndex === null && legalMoveSet.has(key);
              const isCapture = isLegalMove && square !== null;
              const isFogged = replayIndex === null && visibleSquares ? !visibleSquares.has(key) : false;
              const isClickable = replayIndex === null && !promotionPending && !gameOver && !isAiThinking &&
                ((square?.color === turn && !isFogged && !(aiMode && turn === AI_COLOR) && !(onlineGame && turn !== onlineGame.myColor)) || isLegalMove);
              const isDragSource = replayIndex === null && !!ghostPos &&
                dragRef.current?.from[0] === rowIndex &&
                dragRef.current?.from[1] === colIndex;

              return (
                <Square
                  key={key}
                  square={square}
                  row={rowIndex}
                  col={colIndex}
                  isSelected={isSelected}
                  isLegalMove={isLegalMove}
                  isCapture={isCapture}
                  isClickable={isClickable}
                  isDragSource={isDragSource}
                  isFogged={isFogged}
                  isHintFrom={hintMove?.from[0] === rowIndex && hintMove?.from[1] === colIndex}
                  isHintTo={hintMove?.to[0] === rowIndex && hintMove?.to[1] === colIndex}
                  isLastFrom={lastMoveHighlight?.from[0] === rowIndex && lastMoveHighlight?.from[1] === colIndex}
                  isLastTo={lastMoveHighlight?.to[0] === rowIndex && lastMoveHighlight?.to[1] === colIndex}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  onPointerDown={(e) => handlePointerDown(rowIndex, colIndex, e)}
                />
              );
            })
          )}
        </div>

        {/* Crazyhouse 백 패 */}
        {hand && (
          <div className={`${styles.handPanel} ${turn !== 'white' || gameOver ? styles.handPanelInactive : ''}`}>
            <span className={styles.handLabel}>패</span>
            {hand.white.length === 0
              ? <span className={styles.handEmpty}>없음</span>
              : hand.white.map((pt, i) => (
                  <button
                    key={i}
                    className={`${styles.handPiece} ${dropPiece === pt && turn === 'white' ? styles.handPieceSelected : ''}`}
                    onClick={() => { if (turn === 'white' && !gameOver) handleHandPieceClick(pt); }}
                    disabled={turn !== 'white' || !!gameOver}
                  >
                    <Piece piece={{ type: pt, color: 'white' }} />
                  </button>
                ))
            }
          </div>
        )}

        {/* 백 패널 */}
        <PlayerPanel
          color="white"
          isActive={!gameOver && turn === 'white' && replayIndex === null}
          isInCheck={turn === 'white' && inCheck}
          capturedPieces={capturedByWhite}
          materialAdvantage={Math.max(0, whiteMat - blackMat)}
          opponentMaterial={blackMat}
          name={playerNames.white}
          timeSeconds={isFinite(timeControl.seconds) ? whiteTime : undefined}
        />

        {/* 드래그 고스트 피스 */}
        {ghostPos && dragPiece && (
          <div className={styles.ghost} style={{ left: ghostPos.x, top: ghostPos.y }}>
            <Piece piece={dragPiece} />
          </div>
        )}

        {promotionPending && (
          <PromotionPicker color={promotionPending.color} onSelect={handlePromotion} />
        )}
        {gameOver && replayIndex === null && (
          <GameOver
            status={gameOver.status}
            loser={gameOver.loser}
            playerNames={playerNames}
            onRestart={onlineGame ? undefined : handleRestart}
            onReplay={moveHistory.length > 0 ? () => { setReplayIndex(0); setReplayPlaying(false); } : undefined}
          />
        )}
      </div>

      {/* ── 사이드 패널 ──────────────────────────────────────────────────── */}
      <div className={styles.sidePanel}>
        {replayIndex !== null ? (
          /* ── 리플레이 모드 ── */
          <>
            <div className={styles.modeTag}>
              <span className={styles.replayLabel}>▶ 리플레이 중</span>
              <button className={styles.replayExitBtn} onClick={handleReplayExit} title="리플레이 종료">✕</button>
            </div>

            <div className={styles.moveHistoryWrapper}>
              <MoveHistory entries={displayHistory} activeIndex={historyActiveIndex} />
            </div>

            <div className={styles.replayInfo}>
              {replayIndex} / {moveHistory.length}
            </div>
            <div className={styles.replayControls}>
              <button className={styles.replayBtn} onClick={handleReplayFirst} title="처음으로">⏮</button>
              <button className={styles.replayBtn} onClick={handleReplayPrev}  title="이전">◀</button>
              <button className={`${styles.replayBtn} ${styles.replayBtnPlay}`} onClick={handleReplayToggle} title={replayPlaying ? '일시정지' : '자동 재생'}>
                {replayPlaying ? '⏸' : '▶'}
              </button>
              <button className={styles.replayBtn} onClick={handleReplayNext}  title="다음">▶</button>
              <button className={styles.replayBtn} onClick={handleReplayLast}  title="끝으로">⏭</button>
            </div>
          </>
        ) : (
          /* ── 일반 모드 ── */
          <>
            {/* 모드 표시 + 효과음 토글 */}
            <div className={styles.modeTag}>
              <span>
                {onlineGame
                  ? `🌐 온라인 (${onlineGame.myColor === 'white' ? '백' : '흑'})`
                  : aiMode ? `🤖 AI 대전 · ${DIFFICULTY_LABEL[difficulty]}` : '👥 2인 대전'}
                {isAiThinking && <span className={styles.aiThinking}> · 생각 중…</span>}
                {onlineGame && !gameOver && turn !== onlineGame.myColor && replayIndex === null && (
                  <span className={styles.aiThinking}> · 상대 차례</span>
                )}
              </span>
              <div className={styles.modeTagBtns}>
                <button
                  className={styles.themeToggle}
                  onClick={() => setTheme(toggleTheme())}
                  title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button
                  className={styles.soundToggle}
                  onClick={() => setSoundOn(v => !v)}
                  title={soundOn ? '효과음 끄기' : '효과음 켜기'}
                >
                  {soundOn ? '🔊' : '🔇'}
                </button>
              </div>
            </div>

            {/* 기보 */}
            <div className={styles.moveHistoryWrapper}>
              <MoveHistory entries={displayHistory} activeIndex={historyActiveIndex} />
            </div>

            {/* 되돌리기 + 힌트 */}
            <div className={styles.btnGroup}>
              {!onlineGame && (
                <button
                  className={styles.undoBtn}
                  onClick={handleUndo}
                  disabled={!canUndo}
                >
                  ↩ 되돌리기{aiMode ? ' (2수)' : ''}
                </button>
              )}
              <button
                className={styles.hintBtn}
                onClick={handleHint}
                disabled={!canHint}
                title={hintsRemaining === 0 ? '힌트 소진' : `힌트 (${hintsRemaining}회 남음)`}
              >
                💡 힌트 ({hintsRemaining})
              </button>
            </div>

            {/* 항복 버튼 */}
            {!gameOver && (
              resignConfirm ? (
                <div className={styles.resignConfirm}>
                  <span className={styles.resignConfirmText}>정말 항복?</span>
                  <button className={styles.resignYesBtn} onClick={handleResign}>예</button>
                  <button className={styles.resignNoBtn} onClick={() => setResignConfirm(false)}>취소</button>
                </div>
              ) : (
                <button
                  className={styles.resignBtn}
                  onClick={() => setResignConfirm(true)}
                  disabled={!canResign}
                >
                  🏳️ 항복
                </button>
              )
            )}

            {/* FEN (온라인 모드에서는 숨김) */}
            {!gameOver && !onlineGame && (
              <div className={`${styles.fenBox} ${fenExpanded ? styles.fenBoxOpen : ''}`}>
                <div className={styles.fenHeader}>
                  <span className={styles.fenLabel}>FEN</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.fenCopyBtn} onClick={handleCopyFen}>
                      {fenCopied ? '✓ 복사됨' : '복사'}
                    </button>
                    <button
                      className={styles.fenToggleBtn}
                      onClick={() => setFenExpanded(v => !v)}
                      title={fenExpanded ? 'FEN 접기' : 'FEN 펼치기'}
                    >
                      {fenExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
                <div className={styles.fenContent}>
                  <div className={styles.fenText}>{fen}</div>
                  <div className={styles.fenLoadArea}>
                    <textarea
                      className={styles.fenInput}
                      value={fenInput}
                      onChange={e => { setFenInput(e.target.value); setFenError(null); }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLoadFen(); } }}
                      placeholder="FEN 붙여넣기…"
                      rows={2}
                      spellCheck={false}
                    />
                    {fenError && <div className={styles.fenError}>{fenError}</div>}
                    <button
                      className={styles.fenLoadBtn}
                      onClick={handleLoadFen}
                      disabled={!fenInput.trim()}
                    >
                      불러오기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
