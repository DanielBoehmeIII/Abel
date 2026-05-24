export interface CompressedContext {
  originalTokens: number;
  compressedTokens: number;
  text: string;
  compressionRatio: number;
  summary?: string;
}

export function compressContext(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000,
): CompressedContext {
  let totalTokens = 0;
  const estimates = messages.map(m => {
    const tokens = estimateTokens(m.content);
    totalTokens += tokens;
    return { ...m, tokens };
  });

  if (totalTokens <= maxTokens) {
    return {
      originalTokens: totalTokens,
      compressedTokens: totalTokens,
      text: estimates.map(m => `${m.role}: ${m.content}`).join('\n'),
      compressionRatio: 1,
    };
  }

  const recentMessages = estimates.slice(-5);
  const olderMessages = estimates.slice(0, -5);

  const oldSummary = summarizeMessages(olderMessages);
  const recentText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');

  const summaryTokens = estimateTokens(oldSummary);
  const recentTokens = estimateTokens(recentText);
  const compressedTokens = summaryTokens + recentTokens;

  const text = summaryTokens > 0
    ? `[Previous context summary]: ${oldSummary}\n\n${recentText}`
    : recentText;

  return {
    originalTokens: totalTokens,
    compressedTokens,
    text,
    compressionRatio: totalTokens > 0 ? compressedTokens / totalTokens : 1,
    summary: summaryTokens > 0 ? oldSummary : undefined,
  };
}

export function summarizeMessages(messages: Array<{ role: string; content: string; tokens: number }>): string {
  if (messages.length === 0) return '';
  const totalTokens = messages.reduce((s, m) => s + m.tokens, 0);
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'abel' || m.role === 'assistant').length;
  return `Conversation with ${userMessages} user messages and ${assistantMessages} AI responses (approximately ${totalTokens} tokens).`;
}

export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 3.5);
}

export function compressSystemPrompt(prompt: string, maxChars: number = 2000): string {
  if (prompt.length <= maxChars) return prompt;
  const sections = prompt.split('\n##');
  const keep: string[] = [];
  let total = 0;
  for (const section of sections) {
    const sectionTokens = estimateTokens(section);
    if (total + sectionTokens <= maxChars / 3.5) {
      keep.push(section);
      total += sectionTokens;
    } else {
      break;
    }
  }
  return keep.join('\n##');
}
