export type TimeControlMode = 'blitz3' | 'blitz5' | 'rapid10' | 'classic30' | 'unlimited';

export interface TimeControl {
  mode: TimeControlMode;
  seconds: number;
}

export const TIME_CONTROL_OPTIONS: { mode: TimeControlMode; label: string; seconds: number }[] = [
  { mode: 'blitz3',    label: '블리츠 3분',  seconds: 3 * 60 },
  { mode: 'blitz5',    label: '블리츠 5분',  seconds: 5 * 60 },
  { mode: 'rapid10',   label: '래피드 10분', seconds: 10 * 60 },
  { mode: 'classic30', label: '클래식 30분', seconds: 30 * 60 },
  { mode: 'unlimited', label: '무제한',       seconds: Infinity },
];
