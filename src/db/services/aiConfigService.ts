import { db } from '../db';
import type { AIConfigRecord } from '../schema';

const now = () => new Date().toISOString();

export const DEFAULT_AI_CONFIG: Omit<AIConfigRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  tone:              'philosophical',
  verbosity:         'balanced',
  expertiseLevel:    'intermediate',
  memoryUsageLevel:  'standard',
  responseFormat:    'narrative',
};

export const aiConfigService = {
  async get(userId: string): Promise<AIConfigRecord | undefined> {
    return db.aiConfigs.where('userId').equals(userId).first();
  },

  async upsert(userId: string, patch: Partial<AIConfigRecord>): Promise<AIConfigRecord> {
    const existing = await db.aiConfigs.where('userId').equals(userId).first();
    if (existing) {
      const updated = { ...existing, ...patch, userId, updatedAt: now() };
      await db.aiConfigs.put(updated);
      return updated;
    }
    const record: AIConfigRecord = {
      ...DEFAULT_AI_CONFIG,
      ...patch,
      id: `aicfg-${userId}`,
      userId,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.aiConfigs.add(record);
    return record;
  },

  // Converts stored config into a system prompt context block.
  // Future AI pipeline reads this to adjust responses.
  toPromptContext(cfg: AIConfigRecord): string {
    const lines: string[] = [
      `Tone: ${cfg.tone}`,
      `Verbosity: ${cfg.verbosity}`,
      `Expertise level: ${cfg.expertiseLevel}`,
      `Memory usage: ${cfg.memoryUsageLevel}`,
      `Response format: ${cfg.responseFormat}`,
    ];
    if (cfg.projectFocus)        lines.push(`Project focus: ${cfg.projectFocus}`);
    if (cfg.codingStyle)         lines.push(`Coding style: ${cfg.codingStyle}`);
    if (cfg.customInstructions)  lines.push(`Custom instructions: ${cfg.customInstructions}`);
    return lines.join('\n');
  },
};
