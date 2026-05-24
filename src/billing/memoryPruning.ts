export interface PruningResult {
  removedItems: number;
  tokensSaved: number;
  remainingItems: number;
  summary: string;
}

export interface ConversationSegment {
  id: string;
  messages: Array<{ role: string; content: string }>;
  totalTokens: number;
  createdAt: string;
  lastAccessedAt: string;
  importance: number;
}

export function pruneConversations(
  segments: ConversationSegment[],
  maxTotalTokens: number = 100_000,
  maxAgeDays: number = 90,
): PruningResult {
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

  let totalTokens = segments.reduce((s, seg) => s + seg.totalTokens, 0);
  const sorted = [...segments].sort((a, b) => {
    const aScore = a.importance * 10 + (now - new Date(a.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    const bScore = b.importance * 10 + (now - new Date(b.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    return aScore - bScore;
  });

  let removed = 0;
  let tokensSaved = 0;

  for (const seg of sorted) {
    if (totalTokens <= maxTotalTokens) break;
    if (now - new Date(seg.createdAt).getTime() < maxAge && seg.importance > 0.3) continue;
    tokensSaved += seg.totalTokens;
    totalTokens -= seg.totalTokens;
    removed++;
  }

  const remainingCount = segments.length - removed;
  const summary = `Pruned ${removed} old/low-importance conversations, saving ~${tokensSaved} tokens. ${remainingCount} conversations remain.`;

  return { removedItems: removed, tokensSaved, remainingItems: remainingCount, summary };
}

export function estimateConversationImportance(segments: ConversationSegment[]): ConversationSegment[] {
  return segments.map(seg => {
    const userMsgs = seg.messages.filter(m => m.role === 'user').length;
    const hasReflection = seg.messages.some(m => m.content.toLowerCase().includes('reflect') || m.content.toLowerCase().includes('insight'));
    const recency = (Date.now() - new Date(seg.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    let importance = 0.5;
    if (hasReflection) importance += 0.2;
    if (userMsgs > 5) importance += 0.1;
    if (recency < 7) importance += 0.2;
    if (recency > 60) importance -= 0.2;
    return { ...seg, importance: Math.max(0, Math.min(1, importance)) };
  });
}

export function createRetrievalSummary(segments: ConversationSegment[]): string {
  if (segments.length === 0) return '';
  const totalTokens = segments.reduce((s, seg) => s + seg.totalTokens, 0);
  return `[Memory archive: ${segments.length} past conversations, ~${totalTokens} tokens total. Last conversation: ${segments[segments.length - 1]?.lastAccessedAt ?? 'unknown'}]`;
}
