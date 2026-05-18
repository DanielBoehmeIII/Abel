import { db } from '../db';
import type { AIConfigRecord } from '../schema';
import type { LLMProvider } from '../../types/abel';
import { auditLogService } from './auditLogService';
import { aiConfigService } from './aiConfigService';

const now = () => new Date().toISOString();

export interface ProviderConfig {
  provider:    LLMProvider;
  apiKey:      string;
  modelName:   string;
  baseUrl:     string;
}

export const providerConfigService = {
  async get(userId: string): Promise<ProviderConfig | null> {
    const cfg = await db.aiConfigs.where('userId').equals(userId).first();
    if (!cfg || !cfg.provider) return null;
    return {
      provider:  cfg.provider,
      apiKey:    cfg.apiKey ?? '',
      modelName: cfg.modelName ?? '',
      baseUrl:   cfg.baseUrl ?? '',
    };
  },

  async save(userId: string, config: ProviderConfig): Promise<void> {
    const existing = await db.aiConfigs.where('userId').equals(userId).first();
    const patch: Partial<AIConfigRecord> = {
      provider:          config.provider,
      apiKey:            config.apiKey,
      apiKeyConfigured:  !!config.apiKey,
      modelName:         config.modelName,
      baseUrl:           config.baseUrl,
    };
    if (existing) {
      await db.aiConfigs.put({ ...existing, ...patch, userId, updatedAt: now() });
    } else {
      await aiConfigService.upsert(userId, patch);
    }
    await auditLogService.record({
      userId,
      action: 'ai_config_change',
      resourceType: 'ai-config',
      resourceId: `provider-${userId}`,
      status: 'succeeded',
      metadata: { changedKeys: ['provider', 'apiKeyConfigured', 'modelName', 'baseUrl'] },
    });
  },

  async clear(userId: string): Promise<void> {
    const existing = await db.aiConfigs.where('userId').equals(userId).first();
    if (existing) {
      await db.aiConfigs.put({
        ...existing,
        provider: undefined,
        apiKey: undefined,
        apiKeyConfigured: false,
        modelName: undefined,
        baseUrl: undefined,
        updatedAt: now(),
      });
    }
  },
};
