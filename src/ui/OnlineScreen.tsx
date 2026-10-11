import { useState, useEffect } from 'react';
import { AVAILABLE_RULESETS, StandardRules, type RuleSet } from '../rules';
import { getPlayerId, generateRoomId } from '../firebase/identity';
import { createRoom, joinRoom, listenRoom } from '../firebase/room';
import { boardToFen } from '../utils/fen';
import type { Color } from '../core/types';
import styles from './OnlineScreen.module.css';

// Crazyhouse hand sync not supported in online mode
const ONLINE_RULESETS: RuleSet[] = AVAILABLE_RULESETS.filter(r => r.name !== 'Crazyhouse');

interface ReadyParams {
  roomId: string;
  myColor: Color;
  myName: string;
  opponentName: string;
  rulesetName: string;
}

interface Props {
  onReady: (params: ReadyParams) => void;
  onBack: () => void;
}

export function OnlineScreen({ onReady, onBack }: Props) {
  const [phase, setPhase] = useState<'setup' | 'creating' | 'joining'>('setup');
  const [myName, setMyName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [selectedRuleset, setSelectedRuleset] = useState<RuleSet>(StandardRules);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // While waiting: watch for opponent to join
  useEffect(() => {
    if (phase !== 'creating' || !createdRoomId) return;
    const unsub = listenRoom(createdRoomId, (doc) => {
      if (!doc) return;
      if (doc.status === 'playing' && doc.black) {
        unsub();
        onReady({
          roomId: createdRoomId,
          myColor: 'white',
          myName: doc.white.name,
          opponentName: doc.black.name,
          rulesetName: doc.rulesetName,
        });
      }
    });
    return unsub;
  }, [phase, createdRoomId]);

  async function handleCreate() {
    const name = myName.trim() || '백';
    setLoading(true);
    setError(null);
    try {
      const uid = getPlayerId();
      const roomId = generateRoomId();
      const initialBoard = selectedRuleset.createInitialBoard();
      const initialContext = selectedRuleset.createInitialContext();
      const initialFen = boardToFen(initialBoard, 'white', initialContext, 0, 1);
      await createRoom(roomId, selectedRuleset.name, name, uid, initialFen);
      setCreatedRoomId(roomId);
      setPhase('creating');
    } catch {
      setError('방 생성에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const code = roomCodeInput.trim().toUpperCase();
    const name = myName.trim() || '흑';
    if (!code) { setError('방 코드를 입력해 주세요.'); return; }
    setLoading(true);
    setError(null);
    try {
      const uid = getPlayerId();
      const result = await joinRoom(code, name, uid);
      if (!result) {
        setError('방을 찾을 수 없거나 이미 시작된 게임입니다.');
        return;
      }
      onReady({
        roomId: code,
        myColor: result.color,
        myName: name,
        opponentName: result.whiteName,
        rulesetName: result.rulesetName,
      });
    } catch {
      setError('참가에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(createdRoomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Waiting for opponent ─────────────────────────────────────────────────

  if (phase === 'creating') {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.logo}>🌐</div>
          <h2 className={styles.title}>방 생성됨</h2>
          <p className={styles.subtitle}>상대방에게 코드를 공유하세요</p>

          <div className={styles.roomCodeBox}>
            <span className={styles.roomCode}>{createdRoomId}</span>
            <button className={styles.copyBtn} onClick={handleCopyCode}>
              {copied ? '✓' : '복사'}
            </button>
          </div>

          <div className={styles.waiting}>
            <span className={styles.waitingDot} />
            상대방 입장 대기 중…
          </div>

          <button
            className={styles.backBtn}
            onClick={() => { setPhase('setup'); setCreatedRoomId(''); }}
          >
            ← 취소
          </button>
        </div>
      </div>
    );
  }

  // ── Join by code ─────────────────────────────────────────────────────────

  if (phase === 'joining') {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.logo}>🌐</div>
          <h2 className={styles.title}>방 참가</h2>

          <div className={styles.form}>
            <input
              className={styles.input}
              value={myName}
              onChange={e => setMyName(e.target.value)}
              placeholder="내 이름 (선택)"
              maxLength={16}
              autoFocus
            />
            <input
              className={`${styles.input} ${styles.codeInput}`}
              value={roomCodeInput}
              onChange={e => { setRoomCodeInput(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              placeholder="방 코드 6자리"
              maxLength={6}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button
              className={styles.primaryBtn}
              onClick={handleJoin}
              disabled={loading || !roomCodeInput.trim()}
            >
              {loading ? '참가 중…' : '참가하기'}
            </button>
          </div>

          <button className={styles.backBtn} onClick={() => { setPhase('setup'); setError(null); setRoomCodeInput(''); }}>
            ← 뒤로
          </button>
        </div>
      </div>
    );
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>🌐</div>
        <h1 className={styles.title}>온라인 대전</h1>
        <p className={styles.subtitle}>같은 방 코드로 연결해서 대전</p>

        <div className={styles.section}>
          <p className={styles.label}>내 이름</p>
          <input
            className={styles.input}
            value={myName}
            onChange={e => setMyName(e.target.value)}
            placeholder="이름 (기본값 사용)"
            maxLength={16}
          />
        </div>

        <div className={styles.section}>
          <p className={styles.label}>규칙</p>
          <div className={styles.ruleCards}>
            {ONLINE_RULESETS.map(r => (
              <button
                key={r.name}
                className={`${styles.ruleCard} ${selectedRuleset === r ? styles.ruleCardSelected : ''}`}
                onClick={() => setSelectedRuleset(r)}
              >
                <div className={styles.ruleCardName}>{r.name}</div>
                <div className={styles.ruleCardDesc}>{r.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? '생성 중…' : '방 만들기 (백 기물)'}
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => { setPhase('joining'); setError(null); }}
          >
            방 참가 (흑 기물)
          </button>
        </div>

        <button className={styles.backBtn} onClick={onBack}>← 홈으로</button>
      </div>
    </div>
  );
}
