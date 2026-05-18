// Context Retrieval Engine — deterministic keyword + metadata ranking.
//
// API is designed so vector/embedding search can be dropped in later:
// swap scoreMemory() with an embedding cosine similarity function
// and the rest of the pipeline stays the same.

import { memoryService } from '../db/services/memoryService';
import { chatService } from '../db/services/chatService';
import { graphService } from '../db/services/graphService';
import { userService } from '../db/services/userService';
import { aiConfigService } from '../db/services/aiConfigService';

// ── Public types ─────────────────────────────────────────────────────────────

export type SourceType = 'memory' | 'thread' | 'graph-node' | 'profile' | 'ai-config';

export interface ScoreBreakdown {
  keyword:    number;  // 0-1 — query word overlap
  tag:        number;  // 0-1 — tag overlap with query words
  recency:    number;  // 0-1 — exponential decay from createdAt
  confidence: number;  // 0-1 — from memory.confidence or default
  typeBoost:  number;  // 0 or 0.2 — memory type matches detected topic
}

export interface ContextSource {
  type:           SourceType;
  id:             string;
  title:          string;
  content:        string;
  score:          number;
  breakdown:      ScoreBreakdown;
  sourceRef?:     string;   // e.g. "thread:t-123" or "memory:m-456"
}

export interface ConflictPair {
  a:      ContextSource;
  b:      ContextSource;
  reason: string;
}

export interface RetrievedContext {
  query:          string;
  sources:        ContextSource[];       // all retrieved, sorted by score
  topSources:     ContextSource[];       // trimmed to memoryUsageLevel limit
  compressed:     string;               // ready-to-inject prompt context block
  conflicts:      ConflictPair[];
  retrievedAt:    string;
  durationMs:     number;
}

export interface RetrievalOptions {
  memoryUsageLevel?: 'minimal' | 'standard' | 'deep';
  includeThreads?:   boolean;
  includeGraph?:     boolean;
  maxSources?:       number;
}

const LIMITS: Record<string, number> = { minimal: 3, standard: 6, deep: 12 };

// ── Scoring utilities ─────────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
}

function keywordScore(queryTokens: string[], text: string): number {
  if (!queryTokens.length) return 0;
  const textLow = text.toLowerCase();
  const hits = queryTokens.filter(w => textLow.includes(w)).length;
  return hits / queryTokens.length;
}

function tagScore(queryTokens: string[], tags: string[]): number {
  if (!queryTokens.length || !tags.length) return 0;
  const qSet = new Set(queryTokens);
  const hits = tags.filter(t => {
    const tl = t.toLowerCase();
    return qSet.has(tl) || queryTokens.some(w => tl.includes(w));
  }).length;
  return Math.min(1, hits / Math.max(1, qSet.size));
}

function recencyScore(isoDate: string): number {
  const ageDays = (Date.now() - new Date(isoDate).getTime()) / 86_400_000;
  return Math.exp(-ageDays / 45); // half-life ~31 days
}

type TopicHint = 'goal' | 'preference' | 'skill' | 'project' | 'fact' | null;

function detectTopicHint(query: string): TopicHint {
  const q = query.toLowerCase();
  if (/goal|want|aim|journey|intention/.test(q))      return 'goal';
  if (/prefer|like|avoid|style|habit/.test(q))        return 'preference';
  if (/skill|learn|know|proficient|ability/.test(q))  return 'skill';
  if (/project|build|work|sprint|deadline/.test(q))   return 'project';
  return null;
}

function typeBoost(memType: string, hint: TopicHint): number {
  if (!hint) return 0;
  return memType === hint ? 0.2 : 0;
}

// ── Conflict detection ───────────────────────────────────────────────────────

const POS_WORDS = new Set(['prefer', 'like', 'love', 'enjoy', 'want', 'do', 'always', 'can', 'will', 'good', 'best']);
const NEG_WORDS = new Set(['avoid', 'dislike', 'hate', 'never', "don't", "won't", "can't", 'bad', 'worst', 'stop', 'stopped']);

function extractKeyTerms(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !['about', 'their', 'which', 'where', 'there'].includes(w))
  );
}

function hasPos(text: string): boolean {
  return [...POS_WORDS].some(w => text.toLowerCase().includes(w));
}
function hasNeg(text: string): boolean {
  return [...NEG_WORDS].some(w => text.toLowerCase().includes(w));
}

function detectConflicts(sources: ContextSource[]): ConflictPair[] {
  const memSources = sources.filter(s => s.type === 'memory');
  const pairs: ConflictPair[] = [];

  for (let i = 0; i < memSources.length; i++) {
    for (let j = i + 1; j < memSources.length; j++) {
      const a = memSources[i];
      const b = memSources[j];
      const termsA = extractKeyTerms(a.title + ' ' + a.content);
      const termsB = extractKeyTerms(b.title + ' ' + b.content);
      const overlap = [...termsA].filter(t => termsB.has(t)).length;

      if (overlap >= 2) {
        const aPos = hasPos(a.content), aNeg = hasNeg(a.content);
        const bPos = hasPos(b.content), bNeg = hasNeg(b.content);
        if ((aPos && bNeg) || (aNeg && bPos)) {
          pairs.push({ a, b, reason: `Shared terms (${overlap}) with opposing sentiment` });
        }
      }
    }
  }
  return pairs;
}

// ── Context compression ──────────────────────────────────────────────────────

function compress(sources: ContextSource[], maxChars = 2400): string {
  const lines: string[] = [];
  let total = 0;
  for (const s of sources) {
    const snippet = `[${s.type.toUpperCase()}] ${s.title}: ${s.content.slice(0, 280)}`;
    if (total + snippet.length > maxChars) break;
    lines.push(snippet);
    total += snippet.length + 1;
  }
  return lines.join('\n');
}

// ── Main retrieve function ────────────────────────────────────────────────────

export async function retrieveContext(
  userId: string,
  query: string,
  opts: RetrievalOptions = {},
): Promise<RetrievedContext> {
  const t0 = Date.now();
  const {
    memoryUsageLevel = 'standard',
    includeThreads   = true,
    includeGraph     = true,
  } = opts;

  const limit = opts.maxSources ?? LIMITS[memoryUsageLevel] ?? 6;
  const queryTokens = tokenise(query);
  const hint = detectTopicHint(query);
  const sources: ContextSource[] = [];

  // ── Memories ────────────────────────────────────────────────────────────
  const memories = await memoryService.list(userId, { archived: false });
  for (const mem of memories) {
    const kw   = keywordScore(queryTokens, `${mem.title} ${mem.content}`);
    const tag  = tagScore(queryTokens, mem.tags);
    const rec  = recencyScore(mem.createdAt);
    const conf = mem.confidence ?? 0.8;
    const tb   = typeBoost(mem.type, hint);
    const score = kw * 0.45 + tag * 0.20 + rec * 0.15 + conf * 0.10 + tb + 0.10;

    sources.push({
      type:      'memory',
      id:        mem.id,
      title:     mem.title,
      content:   mem.content,
      score,
      breakdown: { keyword: kw, tag, recency: rec, confidence: conf, typeBoost: tb },
      sourceRef: `memory:${mem.id}`,
    });
  }

  // ── Context threads ──────────────────────────────────────────────────────
  if (includeThreads) {
    const threads = await chatService.listThreads(userId);
    for (const thread of threads) {
      const msgs = await chatService.getMessages(thread.id);
      const kw      = keywordScore(queryTokens, thread.title);
      const msgKw   = msgs.length ? Math.max(...msgs.map(m => keywordScore(queryTokens, m.content))) : 0;
      const rec     = recencyScore(thread.updatedAt);
      const ctxBoost = thread.useAsContext ? 0.25 : 0;
      const score = kw * 0.3 + msgKw * 0.35 + rec * 0.1 + ctxBoost;

      if (score > 0.05) {
        const lastAbelMsg = [...msgs].reverse().find(m => m.role === 'abel');
        sources.push({
          type:      'thread',
          id:        thread.id,
          title:     thread.title,
          content:   lastAbelMsg?.content ?? msgs[msgs.length - 1]?.content ?? '',
          score,
          breakdown: { keyword: kw, tag: 0, recency: rec, confidence: 0.7, typeBoost: ctxBoost },
          sourceRef: `thread:${thread.id}`,
        });
      }
    }
  }

  // ── Graph nodes ──────────────────────────────────────────────────────────
  if (includeGraph) {
    const nodes = await graphService.listNodes(userId);
    for (const node of nodes) {
      const kw  = keywordScore(queryTokens, `${node.label} ${node.description}`);
      const tag = tagScore(queryTokens, node.tags ?? []);
      const rec = recencyScore(node.createdAt);
      const score = kw * 0.5 + tag * 0.25 + rec * 0.1 + 0.15;

      if (score > 0.10) {
        sources.push({
          type:      'graph-node',
          id:        node.id,
          title:     node.label,
          content:   node.description,
          score,
          breakdown: { keyword: kw, tag, recency: rec, confidence: 0.8, typeBoost: 0 },
          sourceRef: `graph:${node.id}`,
        });
      }
    }
  }

  // ── Profile + AI config (always included, low score boost) ──────────────
  const profile = await userService.get(userId);
  if (profile) {
    sources.push({
      type:      'profile',
      id:        userId,
      title:     `${profile.name} — ${profile.title}`,
      content:   `User: ${profile.name}. Title: ${profile.title}.`,
      score:     0.15,
      breakdown: { keyword: 0, tag: 0, recency: 1, confidence: 1, typeBoost: 0 },
      sourceRef: `profile:${userId}`,
    });
  }

  const aiCfg = await aiConfigService.get(userId);
  if (aiCfg) {
    const cfgSummary = `Tone: ${aiCfg.tone}. Verbosity: ${aiCfg.verbosity}. Level: ${aiCfg.expertiseLevel}. Memory: ${aiCfg.memoryUsageLevel}.${aiCfg.projectFocus ? ` Focus: ${aiCfg.projectFocus}.` : ''}`;
    sources.push({
      type:      'ai-config',
      id:        aiCfg.id,
      title:     'AI Config',
      content:   cfgSummary,
      score:     0.12,
      breakdown: { keyword: 0, tag: 0, recency: 1, confidence: 1, typeBoost: 0 },
      sourceRef: `ai-config:${aiCfg.id}`,
    });
  }

  // ── Sort + trim ──────────────────────────────────────────────────────────
  sources.sort((a, b) => b.score - a.score);
  const topSources = sources.slice(0, limit);

  // ── Conflict detection (on top sources only) ──────────────────────────────
  const conflicts = detectConflicts(topSources);

  // ── Compress ─────────────────────────────────────────────────────────────
  const compressed = compress(topSources);

  return {
    query,
    sources,
    topSources,
    compressed,
    conflicts,
    retrievedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
