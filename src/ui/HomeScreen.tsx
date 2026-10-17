import { useState } from 'react';
import { AVAILABLE_RULESETS, type RuleSet } from '../rules';
import type { AiDifficulty } from '../ai/engine';
import type { PlayerNames } from '../core/types';
import { TIME_CONTROL_OPTIONS, type TimeControl, type TimeControlMode } from '../core/timeControl';
import { getRecords, clearRecords, type GameRecord } from '../utils/records';
import { toggleTheme, getCurrentTheme } from '../utils/theme';
import styles from './HomeScreen.module.css';

interface Props {
  onGame: (ruleset: RuleSet, aiMode: boolean, difficulty: AiDifficulty, playerNames: PlayerNames, timeControl: TimeControl) => void;
  onTutorial: () => void;
  onOnline: (ruleset: RuleSet) => void;
}

const DIFFICULTY_OPTIONS: { value: AiDifficulty; label: string; desc: string }[] = [
  { value: 'easy',   label: '초급', desc: '실수를 종종 함' },
  { value: 'medium', label: '중급', desc: '균형 잡힌 플레이' },
  { value: 'hard',   label: '고급', desc: '강력한 수 탐색' },
];

const DIFFICULTY_LABEL: Record<AiDifficulty, string> = { easy: '초급', medium: '중급', hard: '고급' };

const RULESET_META: Record<string, { icon: string; color: string }> = {
  '표준':       { icon: '♟',  color: '#b58863' },
  'Chess960':   { icon: '🎲', color: '#5c8fd6' },
  'Crazyhouse': { icon: '🔄', color: '#d4813a' },
  'Fog of War': { icon: '🌁', color: '#6fa8c0' },
  'Atomic':     { icon: '💥', color: '#c0392b' },
  '킹 2개':    { icon: '👑', color: '#c9a227' },
  '아마존':    { icon: '⚡', color: '#9b59b6' },
};

function formatRecordResult(record: GameRecord): string {
  if (record.result === 'draw') return '무';
  return record.result === 'white' ? record.white : record.black;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch { return ''; }
}

type OpponentMode = 'pvp' | 'ai' | 'online';

export function HomeScreen({ onGame, onTutorial, onOnline }: Props) {
  const [selected, setSelected] = useState<RuleSet>(AVAILABLE_RULESETS[0]);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ai');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [whiteName, setWhiteName] = useState('');
  const [blackName, setBlackName] = useState('');
  const [timeMode, setTimeMode] = useState<TimeControlMode>('unlimited');
  const [records, setRecords] = useState<GameRecord[]>(() => getRecords());
  const [theme, setTheme] = useState(getCurrentTheme);

  function handleStart() {
    if (opponentMode === 'online') {
      onOnline(selected);
      return;
    }
    const tc = TIME_CONTROL_OPTIONS.find(o => o.mode === timeMode)!;
    const isAi = opponentMode === 'ai';
    const names: PlayerNames = {
      white: whiteName.trim() || '백',
      black: isAi ? `AI · ${DIFFICULTY_LABEL[difficulty]}` : (blackName.trim() || '흑'),
    };
    onGame(selected, isAi, difficulty, names, { mode: tc.mode, seconds: tc.seconds });
  }

  function handleClearRecords() {
    clearRecords();
    setRecords([]);
  }

  const recentRecords = records.slice(-5).reverse();

  return (
    <div className={styles.screen}>
      <button
        className={styles.themeBtn}
        onClick={() => setTheme(toggleTheme())}
        title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className={styles.card}>
        <img src="/hoho_family_mini_games.png" className={styles.heroBanner} alt="호호가족의 미니게임" />
        <h1 className={styles.title}>호호가족의 체스게임</h1>
        <p className={styles.subtitle}>전략의 게임에 오신 것을 환영합니다</p>

        {/* 규칙 선택 */}
        <div className={styles.ruleSection}>
          <p className={styles.ruleLabel}>규칙</p>
          <div className={styles.ruleCards}>
            {AVAILABLE_RULESETS.map((ruleset) => {
              const meta = RULESET_META[ruleset.name] ?? { icon: '♟', color: '#b58863' };
              const isSelected = selected === ruleset;
              return (
                <button
                  key={ruleset.name}
                  className={`${styles.ruleCard} ${isSelected ? styles.ruleCardSelected : ''}`}
                  style={{ borderLeftColor: isSelected ? meta.color : undefined } as React.CSSProperties}
                  onClick={() => setSelected(ruleset)}
                >
                  <div className={styles.ruleCardIcon} style={{ color: meta.color }}>{meta.icon}</div>
                  <div className={styles.ruleCardName}>{ruleset.name}</div>
                  <div className={styles.ruleCardDesc}>{ruleset.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 상대 선택 */}
        <div className={styles.modeSection}>
          <p className={styles.ruleLabel}>상대</p>
          <div className={styles.modeBtns}>
            <button
              className={`${styles.modeBtn} ${opponentMode === 'pvp' ? styles.modeBtnSelected : ''}`}
              onClick={() => setOpponentMode('pvp')}
            >
              👥 2인 대전
            </button>
            <button
              className={`${styles.modeBtn} ${opponentMode === 'ai' ? styles.modeBtnSelected : ''}`}
              onClick={() => setOpponentMode('ai')}
            >
              🤖 AI 대전
            </button>
            <button
              className={`${styles.modeBtn} ${opponentMode === 'online' ? styles.modeBtnSelected : ''}`}
              onClick={() => setOpponentMode('online')}
            >
              🌐 온라인 대전
            </button>
          </div>
        </div>

        {/* 난이도 선택 (AI 모드일 때) */}
        {opponentMode === 'ai' && (
          <div className={styles.difficultySection}>
            <p className={styles.ruleLabel}>난이도</p>
            <div className={styles.difficultyBtns}>
              {DIFFICULTY_OPTIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  className={`${styles.difficultyBtn} ${difficulty === value ? styles.difficultyBtnSelected : ''}`}
                  onClick={() => setDifficulty(value)}
                >
                  <span className={styles.difficultyLabel}>{label}</span>
                  <span className={styles.difficultyDesc}>{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 시간 모드 */}
        {opponentMode !== 'online' && (
          <div className={styles.timeSection}>
            <p className={styles.ruleLabel}>시간</p>
            <div className={styles.timeBtns}>
              {TIME_CONTROL_OPTIONS.map(({ mode, label }) => (
                <button
                  key={mode}
                  className={`${styles.timeBtn} ${timeMode === mode ? styles.timeBtnSelected : ''}`}
                  onClick={() => setTimeMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 플레이어 이름 */}
        {opponentMode !== 'online' && (
          <div className={styles.nameSection}>
            <p className={styles.ruleLabel}>플레이어</p>
            <div className={styles.nameInputs}>
              <input
                className={styles.nameInput}
                value={whiteName}
                onChange={e => setWhiteName(e.target.value)}
                placeholder="백 (기본값)"
                maxLength={16}
              />
              {opponentMode === 'pvp' && (
                <input
                  className={styles.nameInput}
                  value={blackName}
                  onChange={e => setBlackName(e.target.value)}
                  placeholder="흑 (기본값)"
                  maxLength={16}
                />
              )}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleStart}>게임 시작</button>
          <button className={styles.tutorialBtn} onClick={onTutorial}>
            <span className={styles.tutorialIcon}>📖</span>
            튜토리얼 (처음이라면)
          </button>
        </div>

        {/* 최근 전적 */}
        {recentRecords.length > 0 && (
          <div className={styles.recordsSection}>
            <div className={styles.recordsHeader}>
              <p className={styles.ruleLabel} style={{ margin: 0 }}>최근 전적</p>
              <button className={styles.clearBtn} onClick={handleClearRecords}>초기화</button>
            </div>
            <div className={styles.recordsList}>
              {recentRecords.map((r, i) => (
                <div key={i} className={styles.recordRow}>
                  <span className={styles.recordDate}>{formatDate(r.date)}</span>
                  <span className={styles.recordNames}>{r.white} vs {r.black}</span>
                  <span className={styles.recordResult}>{r.result === 'draw' ? '무승부' : `${formatRecordResult(r)} 승`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
