/**
 * Skill Registry
 * Central registry for all skills
 */

import type { SkillDefinition, AdapterType } from '../types/index.js';
import paymentSkill from './payment.js';
import tradingSkill from './trading.js';
import accountSkill from './account.js';

const skills = new Map<string, SkillDefinition>([
  ['payment', paymentSkill],
  ['trading', tradingSkill],
  ['account', accountSkill],
]);

export function registerSkill(skill: SkillDefinition): void {
  skills.set(skill.name, skill);
}

export function getSkill(name: string): SkillDefinition | undefined {
  return skills.get(name);
}

export function listSkills(): SkillDefinition[] {
  return Array.from(skills.values());
}

export function getSkillNames(): string[] {
  return Array.from(skills.keys());
}

export function getSkillsByAdapter(adapterType: AdapterType): SkillDefinition[] {
  return listSkills().filter((skill) =>
    skill.actions.some((action) => action.requiredAdapter === adapterType)
  );
}

export function findSkillForAction(action: string): SkillDefinition | undefined {
  for (const skill of skills.values()) {
    if (skill.actions.some((a) => a.name === action)) {
      return skill;
    }
  }
  return undefined;
}

export default {
  registerSkill,
  getSkill,
  listSkills,
  getSkillNames,
  getSkillsByAdapter,
  findSkillForAction,
};
