import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { StandardRules, type RuleSet } from '../rules';
import { getPlayerId, generateRoomId } from '../firebase/identity';
import { createRoom, joinRoom, listenRoom } from '../firebase/room';
import { boardToFen } from '../utils/fen';
import type { Color } from '../core/types';
import styles from './OnlineScreen.module.css';

const BASE_URL = window.location.origin;

interface ReadyParams {
  roomId: string;
  myColor: Color;
  myName: string;
  opponentName: string;
  rulesetName: string;
}

interface Props {
  initialRuleset?: RuleSet;
  onReady: (params: ReadyParams) => void;
  onBack: () => void;
}

// Crazyhouse hand sync not supported in online mode
function resolveOnlineRuleset(r?: RuleSet): RuleSet {
  if (!r || r.name === 'Crazyhouse') return StandardRules;
  return r;
}

export function OnlineScreen({ initialRuleset, onReady, onBack }: Props) {
  const [phase, setPhase] = useState<'setup' | 'creating' | 'joining'>('setup');
  const [myName, setMyName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const selectedRuleset = resolveOnlineRuleset(initialRuleset);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // URL ?join= 파라미터 감지 → 자동으로 참가 화면으로 이동
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join')?.toUpperCase();
    if (joinCode) {
      setRoomCodeInput(joinCode);
      setPhase('joining');
      // URL 파라미터 제거 (히스토리 오염 방지)
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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

  async function handleShare() {
    const link = `${BASE_URL}/?join=${createdRoomId}`;
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: '호호가족의 체스게임',
          text: '온라인 체스 대전에 초대합니다!',
          url: link,
        });
      } catch {
        // 사용자가 공유 취소 — 무시
      }
    } else {
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  // ── Waiting for opponent ─────────────────────────────────────────────────

  if (phase === 'creating') {
    const shareLink = `${BASE_URL}/?join=${createdRoomId}`;
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.logo}>🌐</div>
          <h2 className={styles.title}>방 생성됨</h2>
          <p className={styles.subtitle}>상대방에게 링크 또는 코드를 공유하세요</p>

          <div className={styles.qrBox}>
            <QRCodeSVG value={shareLink} size={160} bgColor="transparent" fgColor="var(--c-text1)" />
          </div>

          <div className={styles.shareRow}>
            <button className={styles.shareBtn} onClick={handleShare}>
              {copiedLink ? '✓ 복사됨' : 'share' in navigator ? '📤 공유하기' : '🔗 링크 복사'}
            </button>
          </div>

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
          <div className={styles.ruleInfo}>
            <span className={styles.ruleInfoName}>{selectedRuleset.name}</span>
            <span className={styles.ruleInfoDesc}>{selectedRuleset.description}</span>
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
