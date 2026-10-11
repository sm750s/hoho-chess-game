import type { TutorialStep } from '../tutorial/tutorialSteps';
import styles from './TutorialPanel.module.css';

interface Props {
  step: TutorialStep;
  stepIdx: number;
  total: number;
  onNext: () => void;
  onExit: () => void;
}

export function TutorialPanel({ step, stepIdx, total, onNext, onExit }: Props) {
  const lines = step.description.split('\n');

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.lessonBadge}>{step.lesson}</span>
        <button className={styles.exitBtn} onClick={onExit} aria-label="튜토리얼 나가기">✕</button>
      </div>

      <h2 className={styles.title}>{step.title}</h2>

      <div className={styles.description}>
        {lines.map((line, i) =>
          line === '' ? <br key={i} /> : <p key={i}>{line}</p>
        )}
      </div>

      {step.task && (
        <div className={styles.taskBox}>
          <span className={styles.taskArrow}>▶</span>
          <span className={styles.taskText}>{step.task.instruction}</span>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.progress}>
          <span className={styles.progressText}>{stepIdx + 1} / {total}</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${((stepIdx + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {!step.task && (
          <button className={styles.nextBtn} onClick={onNext}>
            {stepIdx + 1 < total ? '다음 →' : '완료!'}
          </button>
        )}
      </div>
    </div>
  );
}
