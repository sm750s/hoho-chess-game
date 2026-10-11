import { StandardRules } from './StandardRules';
import { Chess960Rules } from './Chess960Rules';
import { AtomicRules } from './AtomicRules';
import { TwoKingsRules } from './TwoKingsRules';
import { FogOfWarRules } from './FogOfWarRules';
import { CrazyhouseRules } from './CrazyhouseRules';
import { AmazonRules } from './AmazonRules';
import type { RuleSet } from './RuleSet';

export type { RuleSet };
export { StandardRules, Chess960Rules, AtomicRules, TwoKingsRules, FogOfWarRules, CrazyhouseRules, AmazonRules };

export const AVAILABLE_RULESETS: RuleSet[] = [
  StandardRules,
  Chess960Rules,
  CrazyhouseRules,
  FogOfWarRules,
  AtomicRules,
  TwoKingsRules,
  AmazonRules,
];

export function getRulesetByName(name: string): RuleSet {
  return AVAILABLE_RULESETS.find(r => r.name === name) ?? StandardRules;
}
