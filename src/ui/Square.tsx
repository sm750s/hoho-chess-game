import type { Square as SquareData } from '../core/types';
import { Piece } from './Piece';
import styles from './Square.module.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

interface Props {
  square: SquareData;
  row: number;
  col: number;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isClickable: boolean;
  isDragSource: boolean;
  isAttention?: boolean;
  isFogged?: boolean;
  isHintFrom?: boolean;
  isHintTo?: boolean;
  isLastFrom?: boolean;
  isLastTo?: boolean;
  onClick: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}

export function Square({
  square, row, col,
  isSelected, isLegalMove, isCapture, isClickable, isDragSource,
  isAttention = false,
  isFogged = false,
  isHintFrom = false,
  isHintTo = false,
  isLastFrom = false,
  isLastTo = false,
  onClick, onPointerDown,
}: Props) {
  const isLight = (row + col) % 2 === 0;
  const labelClass = isLight ? styles.onLight : styles.onDark;

  const squareClass = [
    styles.square,
    isLight ? styles.light : styles.dark,
    isSelected ? styles.selected : '',
    isClickable ? styles.clickable : '',
  ].join(' ');

  return (
    <div className={squareClass} onClick={onClick} onPointerDown={onPointerDown}>
      {col === 0 && (
        <span className={`${styles.rankLabel} ${labelClass}`}>{8 - row}</span>
      )}
      {square && !isDragSource && !isFogged && <Piece piece={square} />}
      {square && isDragSource && <span className={styles.dragPlaceholder} />}
      {isAttention && !isSelected && <span className={styles.attention} />}
      {(isLastFrom || isLastTo) && !isSelected && <span className={styles.lastMove} />}
      {(isHintFrom || isHintTo) && !isSelected && <span className={isHintFrom ? styles.hintFrom : styles.hintTo} />}
      {isLegalMove && !isCapture && <span className={styles.dot} />}
      {isCapture && <span className={styles.captureRing} />}
      {isFogged && <span className={styles.fog} />}
      {row === 7 && (
        <span className={`${styles.fileLabel} ${labelClass}`}>{FILES[col]}</span>
      )}
    </div>
  );
}
