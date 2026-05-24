import Dexie, { type Table } from 'dexie';
import type {
  UserRecord, WorkspaceRecord, MemoryRecord, ChatThreadRecord,
  ChatMessageRecord, GraphNodeRecord, GraphEdgeRecord,
  AIConfigRecord, SyncJobRecord,
  AuditLogRecord,
} from './schema';
import type { UsageEvent, TokenUsageRecord, Subscription, Invoice, CreditBalance, OverageCharge, ProfitMetrics, MarginSnapshot, TokenBudget, StripeCustomer } from '../billing/types';

export class AbelDatabase extends Dexie {
  users!:            Table<UserRecord,        string>;
  workspaces!:       Table<WorkspaceRecord,   string>;
  memories!:         Table<MemoryRecord,      string>;
  chatThreads!:      Table<ChatThreadRecord,  string>;
  chatMessages!:     Table<ChatMessageRecord, string>;
  graphNodes!:       Table<GraphNodeRecord,   string>;
  graphEdges!:       Table<GraphEdgeRecord,   string>;
  aiConfigs!:        Table<AIConfigRecord,    string>;
  syncJobs!:         Table<SyncJobRecord,     string>;
  auditLogs!:        Table<AuditLogRecord,    string>;
  usageEvents!:      Table<UsageEvent,        string>;
  tokenUsage!:       Table<TokenUsageRecord,  string>;
  subscriptions!:    Table<Subscription,      string>;
  invoices!:         Table<Invoice,           string>;
  creditBalances!:   Table<CreditBalance,     string>;
  overageCharges!:   Table<OverageCharge,     string>;
  profitMetrics!:    Table<ProfitMetrics,     string>;
  marginSnapshots!:  Table<MarginSnapshot,    string>;
  tokenBudgets!:     Table<TokenBudget,       string>;
  stripeCustomers!:  Table<StripeCustomer,    string>;

  constructor() {
    super('AbelDB');

    this.version(1).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt',
      auditLogs:    '&id, userId, action, status, createdAt',
    });

    this.version(2).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:    '&id, userId, action, status, createdAt',
    });

    this.version(3).stores({
      users:        '&id, email',
      workspaces:   '&id, userId, createdAt',
      memories:     '&id, userId, type, visibility, archived, createdAt, *tags',
      chatThreads:  '&id, userId, archived, createdAt',
      chatMessages: '&id, threadId, userId, createdAt',
      graphNodes:   '&id, userId, type, createdAt',
      graphEdges:   '&id, userId, source, target',
      aiConfigs:    '&id, userId',
      syncJobs:     '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:    '&id, userId, action, status, createdAt',
    }).upgrade(tx => tx.table('memories').toCollection().modify(memory => {
      if (!memory.visibility) memory.visibility = memory.type === 'system' ? 'system' : 'private';
    }));

    this.version(4).stores({
      users:            '&id, email',
      workspaces:       '&id, userId, createdAt',
      memories:         '&id, userId, type, visibility, archived, createdAt, *tags',
      chatThreads:      '&id, userId, archived, createdAt',
      chatMessages:     '&id, threadId, userId, createdAt',
      graphNodes:       '&id, userId, type, createdAt',
      graphEdges:       '&id, userId, source, target',
      aiConfigs:        '&id, userId',
      syncJobs:         '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:        '&id, userId, action, status, createdAt',
      usageEvents:      '&id, userId, provider, type, createdAt',
      tokenUsage:       '&id, userId, date',
      subscriptions:    '&id, userId, tierId, status',
      invoices:         '&id, userId, subscriptionId, status, periodStart',
      creditBalances:   '&id, userId',
      overageCharges:   '&id, userId, subscriptionId, status',
      profitMetrics:    '&id, userId, billingPeriod',
      marginSnapshots:  '&id, snapshotDate',
      tokenBudgets:     '&id, userId',
      stripeCustomers:  '&id, userId',
    });

    this.version(5).stores({
      users:            '&id, email',
      workspaces:       '&id, userId, createdAt',
      memories:         '&id, userId, type, visibility, archived, createdAt, *tags',
      chatThreads:      '&id, userId, archived, createdAt',
      chatMessages:     '&id, threadId, userId, createdAt',
      graphNodes:       '&id, userId, type, createdAt',
      graphEdges:       '&id, userId, source, target',
      aiConfigs:        '&id, userId',
      syncJobs:         '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:        '&id, userId, action, status, createdAt',
      usageEvents:      '&id, userId, provider, type, createdAt',
      tokenUsage:       '&id, userId, date',
      subscriptions:    '&id, userId, tierId, status',
      invoices:         '&id, userId, subscriptionId, status, periodStart',
      creditBalances:   '&id, userId',
      overageCharges:   '&id, userId, subscriptionId, status',
      profitMetrics:    '&id, userId, billingPeriod',
      marginSnapshots:  '&id, snapshotDate',
      tokenBudgets:     '&id, userId',
      stripeCustomers:  '&id, userId',
      teams:            '&id, ownerUserId, name',
      teamMembers:      '&id, teamId, userId',
      referralCodes:    '&id, userId, code',
      referrals:        '&id, referrerUserId, referredUserId, status',
      trials:           '&id, userId, status',
      asyncJobs:        '&id, userId, type, status, createdAt',
    });

    this.version(6).stores({
      users:            '&id, email',
      workspaces:       '&id, userId, createdAt',
      memories:         '&id, userId, type, visibility, archived, createdAt, *tags',
      chatThreads:      '&id, userId, archived, createdAt',
      chatMessages:     '&id, threadId, userId, createdAt',
      graphNodes:       '&id, userId, type, createdAt',
      graphEdges:       '&id, userId, source, target',
      aiConfigs:        '&id, userId',
      syncJobs:         '&id, userId, type, status, createdAt, updatedAt',
      auditLogs:        '&id, userId, action, status, createdAt',
      usageEvents:      '&id, userId, provider, type, createdAt',
      tokenUsage:       '&id, userId, date',
      subscriptions:    '&id, userId, tierId, status',
      invoices:         '&id, userId, subscriptionId, status, periodStart',
      creditBalances:   '&id, userId',
      overageCharges:   '&id, userId, subscriptionId, status',
      profitMetrics:    '&id, userId, billingPeriod',
      marginSnapshots:  '&id, snapshotDate',
      tokenBudgets:     '&id, userId',
      stripeCustomers:  '&id, userId',
      teams:            '&id, ownerUserId, name',
      teamMembers:      '&id, teamId, userId',
      referralCodes:    '&id, userId, code',
      referrals:        '&id, referrerUserId, referredUserId, status',
      trials:           '&id, userId, status',
      asyncJobs:        '&id, userId, type, status, createdAt',
      spendingCaps:     '&id, userId, period',
      enterpriseContracts: '&id, organizationId',
      retentionActions: '&id, userId, createdAt',
    });
  }
}

export const db = new AbelDatabase();
