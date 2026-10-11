import { useEffect, useRef } from 'react';
import type { Color } from '../core/types';
import styles from './MoveHistory.module.css';

export interface MoveEntry {
  notation: string;
  color: Color;
}

interface Props {
  entries: MoveEntry[];
  activeIndex?: number;
}

export function MoveHistory({ entries, activeIndex }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex !== undefined && activeIndex >= 0 && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, activeIndex]);

  const pairs: Array<[MoveEntry, MoveEntry | null]> = [];
  for (let i = 0; i < entries.length; i += 2) {
    pairs.push([entries[i], entries[i + 1] ?? null]);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>기보</div>
      <div className={styles.list}>
        {pairs.length === 0 ? (
          <div className={styles.empty}>이동 없음</div>
        ) : (
          pairs.map(([w, b], idx) => {
            const whiteIdx = idx * 2;
            const blackIdx = idx * 2 + 1;
            const isActiveRow = activeIndex !== undefined && (activeIndex === whiteIdx || activeIndex === blackIdx);
            return (
              <div
                key={idx}
                ref={isActiveRow ? activeRowRef : undefined}
                className={`${styles.row} ${idx % 2 === 0 ? styles.rowEven : ''} ${isActiveRow ? styles.rowActive : ''}`}
              >
                <span className={styles.moveNum}>{idx + 1}.</span>
                <span className={`${styles.move} ${activeIndex === whiteIdx ? styles.moveHighlight : ''}`}>
                  {w.notation}
                </span>
                <span className={`${styles.move} ${styles.black} ${activeIndex === blackIdx ? styles.moveHighlight : ''}`}>
                  {b?.notation ?? ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
