import { useState } from 'react';
import { HomeScreen } from './ui/HomeScreen';
import { Board } from './ui/Board';
import { TutorialScreen } from './ui/TutorialScreen';
import { OnlineScreen } from './ui/OnlineScreen';
import { StandardRules, getRulesetByName, type RuleSet } from './rules';
import type { AiDifficulty } from './ai/engine';
import type { PlayerNames } from './core/types';
import type { Color } from './core/types';
import type { TimeControl } from './core/timeControl';

type Mode = 'home' | 'game' | 'tutorial' | 'online' | 'online-game';

interface OnlineInfo {
  roomId: string;
  myColor: Color;
  playerNames: PlayerNames;
  rulesetName: string;
}

function App() {
  const hasJoinParam = !!new URLSearchParams(window.location.search).get('join');
  const [mode, setMode] = useState<Mode>(hasJoinParam ? 'online' : 'home');
  const [ruleset, setRuleset] = useState<RuleSet>(StandardRules);
  const [aiMode, setAiMode] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [playerNames, setPlayerNames] = useState<PlayerNames>({ white: '백', black: '흑' });
  const [timeControl, setTimeControl] = useState<TimeControl>({ mode: 'unlimited', seconds: Infinity });
  const [onlineInfo, setOnlineInfo] = useState<OnlineInfo | null>(null);

  if (mode === 'game') {
    return (
      <Board
        ruleset={ruleset}
        aiMode={aiMode}
        difficulty={difficulty}
        playerNames={playerNames}
        timeControl={timeControl}
        onExit={() => setMode('home')}
      />
    );
  }

  if (mode === 'online-game' && onlineInfo) {
    return (
      <Board
        ruleset={getRulesetByName(onlineInfo.rulesetName)}
        aiMode={false}
        difficulty="medium"
        playerNames={onlineInfo.playerNames}
        timeControl={{ mode: 'unlimited', seconds: Infinity }}
        onlineGame={{ roomId: onlineInfo.roomId, myColor: onlineInfo.myColor }}
        onExit={() => { setMode('home'); setOnlineInfo(null); }}
      />
    );
  }

  if (mode === 'online') {
    return (
      <OnlineScreen
        onReady={(params) => {
          setOnlineInfo({
            roomId: params.roomId,
            myColor: params.myColor,
            playerNames: {
              white: params.myColor === 'white' ? params.myName : params.opponentName,
              black: params.myColor === 'black' ? params.myName : params.opponentName,
            },
            rulesetName: params.rulesetName,
          });
          setMode('online-game');
        }}
        onBack={() => setMode('home')}
      />
    );
  }

  if (mode === 'tutorial') return <TutorialScreen onExit={() => setMode('home')} />;

  return (
    <HomeScreen
      onGame={(selected, ai, diff, names, tc) => {
        setRuleset(selected);
        setAiMode(ai);
        setDifficulty(diff);
        setPlayerNames(names);
        setTimeControl(tc);
        setMode('game');
      }}
      onTutorial={() => setMode('tutorial')}
      onOnline={() => setMode('online')}
    />
  );
}

export default App;
