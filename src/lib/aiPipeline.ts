// AI Pipeline — abstraction layer between Abel's UI and AI providers.
//
// Current implementation: deterministic mock that shapes responses based on
// user AIConfig (tone, verbosity, expertiseLevel).
//
// Future: swap generateResponse() to call real providers (Claude, ChatGPT, local)
// using buildSystemPrompt() as the system message. The rest of the app stays the same.

import type { AIConfigRecord } from '../db/schema';

// ── Context passed alongside each request ─────────────────────────────────────

export interface AIRequestContext {
  journeyTitle?:       string;
  projectFocus?:       string;
  recentMemoryTitles?: string[];
  useAsContextIds?:    string[];  // thread IDs flagged for retrieval
}

// ── System prompt builder ─────────────────────────────────────────────────────
// Converts AIConfigRecord → system-level instructions for a real provider.
// Also used as the "preview" in Settings so users understand what they're configuring.

export function buildSystemPrompt(cfg: AIConfigRecord, ctx: AIRequestContext = {}): string {
  const toneDesc: Record<string, string> = {
    philosophical: 'Speak with depth and curiosity. Use metaphor where apt. Invite reflection.',
    formal:        'Be professional and structured. Avoid colloquialisms. Prioritise clarity.',
    casual:        'Be warm, friendly, and conversational. Short sentences. No jargon.',
    direct:        'Be terse and action-oriented. Lead with the answer. Omit pleasantries.',
  };
  const verbosityDesc: Record<string, string> = {
    concise: 'Respond in 1–2 sentences maximum. Every word must earn its place.',
    balanced: 'Respond in 2–4 sentences. Cover the main point and one piece of context.',
    verbose:  'Respond in full paragraphs. Provide context, reasoning, and a follow-up prompt.',
  };
  const expertDesc: Record<string, string> = {
    beginner:     'The user is new to this domain. Define terms, be encouraging, avoid overwhelm.',
    intermediate: 'The user has working knowledge. Skip basics, but explain non-obvious steps.',
    expert:       'The user is highly proficient. Use precise technical language, skip explanations.',
  };
  const memDesc: Record<string, string> = {
    minimal:  'Do not reference past memories unless directly relevant.',
    standard: 'Reference recent memories where helpful.',
    deep:     'Actively weave past memories, patterns, and history into every response.',
  };
  const fmtDesc: Record<string, string> = {
    structured: 'Use bullet points, numbered lists, and headers where appropriate.',
    narrative:  'Respond in flowing prose. Avoid bullet points.',
    hybrid:     'Use prose for reflection and lists for action items.',
  };

  const lines: string[] = [
    'You are Abel, a cinematic AI memory and self-improvement OS.',
    '',
    `## Tone\n${toneDesc[cfg.tone] ?? toneDesc.philosophical}`,
    `## Verbosity\n${verbosityDesc[cfg.verbosity] ?? verbosityDesc.balanced}`,
    `## Expertise level\n${expertDesc[cfg.expertiseLevel] ?? expertDesc.intermediate}`,
    `## Memory usage\n${memDesc[cfg.memoryUsageLevel] ?? memDesc.standard}`,
    `## Response format\n${fmtDesc[cfg.responseFormat] ?? fmtDesc.narrative}`,
  ];

  if (cfg.projectFocus || ctx.projectFocus) {
    lines.push(`## Project focus\nThe user is currently focused on: ${cfg.projectFocus ?? ctx.projectFocus}`);
  }
  if (ctx.journeyTitle) {
    lines.push(`## Active journey\n${ctx.journeyTitle}`);
  }
  if (ctx.recentMemoryTitles?.length) {
    lines.push(`## Recent memories\n${ctx.recentMemoryTitles.slice(0, 5).map(t => `- ${t}`).join('\n')}`);
  }
  if (cfg.customInstructions?.trim()) {
    lines.push(`## Custom instructions\n${cfg.customInstructions}`);
  }

  return lines.join('\n');
}

// ── Topic detection ───────────────────────────────────────────────────────────

type Topic = 'quest' | 'archetype' | 'memory' | 'graph' | 'goal' | 'focus' | 'general';

function detectTopic(input: string): Topic {
  const msg = input.toLowerCase();
  if (/quest|task|challenge|mission/.test(msg))                return 'quest';
  if (/archetype|who am i|identity|pattern|personality/.test(msg)) return 'archetype';
  if (/memory|remember|recall|save|record/.test(msg))          return 'memory';
  if (/graph|insight|node|connection|knowledge/.test(msg))     return 'graph';
  if (/goal|journey|vision|intention|aim|purpose/.test(msg))   return 'goal';
  if (/focus|deep work|session|flow|productivity/.test(msg))   return 'focus';
  return 'general';
}

// ── Response bank (tone × topic) ─────────────────────────────────────────────
// Each entry: [concise, balanced, verbose_extension]

type ResponseVariant = [string, string, string];

const RESPONSES: Record<Topic, Record<string, ResponseVariant>> = {
  quest: {
    philosophical: [
      `Quests are invitations to discover what you cannot yet see.`,
      `Quests are invitations, not assignments — each one reveals the next. I'll map a few paths toward your current horizon. Check the Quests tab.`,
      `Quests emerge from the gap between where you are and where the work wants to take you. I'll generate several, calibrated to your journey's arc. Each one is designed to produce knowledge, not just activity — the difference between collecting and becoming. Open Quests when you're ready.`,
    ],
    formal: [
      `Quests will be generated and added to your Quests tab.`,
      `I will generate structured quests aligned with your current journey objectives. These will appear in your Quests tab momentarily.`,
      `Quest generation is now underway. Each quest is aligned to your active journey and calibrated to your current skill baseline. They will appear in your Quests tab sorted by difficulty. I recommend beginning with the foundational quest to establish working context before advancing.`,
    ],
    casual: [
      `On it — quests incoming, check the Quests tab!`,
      `Sure! I'll spin up some quests based on your journey. They'll appear in the Quests tab in a moment. Start with whichever one feels most alive.`,
      `Let's go! I'm generating a set of quests tailored to where you are right now. You'll see them in the Quests tab shortly — I've mixed in some quick wins alongside the bigger challenges so you can build momentum. Let me know if any of them need adjusting.`,
    ],
    direct: [
      `Generating quests. Check Quests tab.`,
      `Generating quests now. Check the Quests tab. Start with the first available one.`,
      `Quests generated. Navigate to Quests tab. Begin with quest 1. Complete in order for best skill compounding. Adjust difficulty in Quest settings if needed.`,
    ],
  },
  archetype: {
    philosophical: [
      `Your primary archetype is **The Architect** — someone who builds systems to hold meaning.`,
      `Based on your memories and completions, your primary archetype is **The Architect** — someone who builds systems, seeks clarity, and synthesises complexity into structure. Your secondary patterns are **The Seeker** and **The Synthesist**.`,
      `Your archetype is not a fixed label — it's an emergent pattern from how you've moved through uncertainty. **The Architect** dominates: you build systems not for their own sake, but to hold meaning that would otherwise scatter. **The Seeker** runs beneath it — a restless drive toward root causes. And **The Synthesist** surfaces when the two converge into something new. These three together describe a mind that is most alive when it is translating complexity into form.`,
    ],
    formal: [
      `Primary archetype: The Architect. Secondary: The Seeker, The Synthesist.`,
      `Analysis of your memory and quest data indicates a primary archetype of **The Architect**, with secondary patterns of **The Seeker** and **The Synthesist**. This profile reflects a systematic approach to knowledge acquisition and problem decomposition.`,
      `Based on a structured analysis of your memory corpus, quest completion patterns, and focus session data, your primary archetype is **The Architect**. This designation reflects your consistent tendency to impose structure on complex domains before engaging with them operationally. Secondary archetypes (**The Seeker**, **The Synthesist**) indicate complementary patterns of root-cause investigation and cross-domain integration. Archetype data is updated as new evidence accumulates.`,
    ],
    casual: [
      `You're **The Architect** — you love building systems to make sense of things.`,
      `Looking at your patterns, you're mostly **The Architect** — you love turning complexity into clear systems. You've also got a strong **Seeker** streak: always going one level deeper.`,
      `Okay, so you're very much **The Architect** — someone who can't help but build systems around everything they touch. It's actually one of your superpowers. Your **Seeker** side means you're rarely satisfied with surface explanations, and your **Synthesist** streak kicks in when you start connecting dots across very different areas. Together? A pretty rare combination.`,
    ],
    direct: [
      `Archetype: **The Architect**. Secondary: Seeker, Synthesist.`,
      `Primary archetype: **The Architect**. Secondary: **The Seeker**, **The Synthesist**. These drive your tendency toward systems, root causes, and synthesis.`,
      `**The Architect** (primary). **The Seeker** and **The Synthesist** (secondary). Architect: you structure before you act. Seeker: you trace problems to their roots. Synthesist: you connect across domains. Update frequency: as memory and quest data accumulates.`,
    ],
  },
  memory: {
    philosophical: [
      `Memories are evidence of who you're becoming — worth preserving carefully.`,
      `I can save this to your Memory Exhibition. Memories here are more than logs — they're evidence of who you're becoming. Would you like to tag this as a Breakthrough or Clarity moment?`,
      `Every memory you record is a signal extracted from noise. Over time, the collection begins to speak — patterns emerge, blind spots reveal themselves, and your future self has something to navigate by. I'll save this now. Consider tagging it with an emotional tone; those tags become especially useful during graph traversal and archetype refinement.`,
    ],
    formal: [
      `This will be saved as a memory record in your database.`,
      `I will record this as a memory entry in your database. Please specify the memory type and any relevant tags to ensure accurate retrieval in the future.`,
      `This entry will be recorded as a structured memory in your local IndexedDB store. For optimal retrieval, I recommend specifying a memory type (fact, goal, preference, project, skill, document, or system) and tagging it with domain-relevant keywords. Well-tagged memories significantly improve the quality of future AI context retrieval.`,
    ],
    casual: [
      `Saving that to memory — nice one for catching it!`,
      `I'll save this to your Memory store. It's easy to forget these moments, so good thinking. You can also tag it in the Memory page if you want to find it later.`,
      `Saving that now! These little captured moments are actually really valuable — the pattern you notice today might become a big insight six months from now. I've tagged it loosely, but head over to the Memory page to fine-tune the type and tags. That'll make it much easier to retrieve when you need it.`,
    ],
    direct: [
      `Saving to memory now.`,
      `Saving to memory. Navigate to Memory page to tag and categorise.`,
      `Saved to memory. Go to Memory page: set type, add tags, adjust confidence. Well-tagged memories improve future AI context quality significantly.`,
    ],
  },
  graph: {
    philosophical: [
      `Insights become graph nodes — the connective tissue of your knowledge system.`,
      `I'll save this as a graph node. Insights like this become connective tissue. Over time, the graph reveals patterns you didn't intend — that's where the real discovery lives.`,
      `The knowledge graph is not a filing system — it's a living map of how your mind has moved through the world. When I add this insight as a node, it begins to attract connections: to memories, to quests, to other concepts you've encountered. The most surprising revelations usually come not from individual nodes but from the edges between them. I'll add this now.`,
    ],
    formal: [
      `This will be saved as a knowledge graph node.`,
      `I will create a graph node for this insight and link it to relevant existing nodes. Navigate to the Graph page to visualise connections.`,
      `A graph node will be created for this insight and integrated into your knowledge graph. The system will attempt to identify relevant connections to existing nodes based on semantic overlap. For precise control over edges and relationships, navigate to the Graph page where you can manually define connection types.`,
    ],
    casual: [
      `Saving as a graph node — love it!`,
      `I'll add this as a graph node. The Graph page will show you how it connects to everything else you've built up. It's one of the cooler features once the graph fills out.`,
      `Adding to the graph! Once you have enough nodes, the graph starts to feel alive — you'll see clusters of ideas you didn't notice were related, and the connections between them often spark new insights. Check it out on the Graph page.`,
    ],
    direct: [
      `Adding to knowledge graph.`,
      `Saving as graph node. Check Graph page for connections.`,
      `Graph node created. Open Graph page. Review auto-linked edges. Add manual edges where automated linking missed context.`,
    ],
  },
  goal: {
    philosophical: [
      `A good goal has a clear arc: from where you are to where the work wants to take you.`,
      `Let's design a journey around this. A good journey has a clear arc — from where you are to where the work wants to take you. What would mastery actually look like for you here?`,
      `Goals in Abel are more than targets — they're the gravity that organises everything else. A well-formed journey pulls quests into orbit, attracts relevant memories, and gives your graph a centre of mass. Let's design one. The key question is: what would mastery feel and look like from the inside? Not the outcome — the texture of it. That detail is what makes the journey specific enough to be useful.`,
    ],
    formal: [
      `A structured journey will be created around this goal.`,
      `I will structure a journey around this objective. Please provide a clear success criterion and a target timeframe to ensure accurate quest generation.`,
      `To build an effective journey, I require the following inputs: (1) a specific, measurable outcome — not a direction, but a destination; (2) a target timeframe; (3) any known constraints or dependencies. Once provided, I will generate a structured journey with sequenced quests, linked skills, and progress milestones.`,
    ],
    casual: [
      `Let's build a journey around this!`,
      `That's a great focus for a journey. Let's design it properly — what does success actually look like to you? That detail shapes everything else.`,
      `Ooh this is a good one for a journey. Journeys in Abel work best when you can describe success in concrete terms — not "be better at X" but "be able to do Y without struggling." Once we nail that, quests and skills basically write themselves. What does mastery feel like from the inside for this goal?`,
    ],
    direct: [
      `Creating a journey for this goal.`,
      `Creating a journey. Define success criterion and timeframe. Quests will be generated based on those inputs.`,
      `Journey creation initiated. Required: success criterion (specific, measurable), timeframe, known constraints. Provide these and quest generation begins immediately.`,
    ],
  },
  focus: {
    philosophical: [
      `Flow begins with a clear intention. What's the one thing this session is for?`,
      `Deep work is one of the rarest and most valuable things you can do for yourself. Before you begin — what is the one outcome that would make this session feel complete?`,
      `Flow states don't happen to you — they're conditions you create. The single most important prerequisite is a clear, bounded intention: not "work on project X" but "complete component Y of project X." That specificity narrows the aperture of your attention until resistance dissolves. What's the one thing this session is for?`,
    ],
    formal: [
      `A focus session can be initiated from the Focus page.`,
      `Focus sessions are managed in the Focus page. Select a mode, set an intention, and configure your duration before beginning.`,
      `Navigate to the Focus page to initiate a structured deep work session. Available modes include Deep Work, Study, Reading, Writing, Recovery, and Creative. Setting a clear intention prior to starting has been shown to significantly improve session quality and post-session reflection accuracy.`,
    ],
    casual: [
      `Head to Focus to start a session — set an intention first!`,
      `Focus sessions are in the Focus page. Set a clear intention before you start — even one sentence makes a big difference to how the session goes.`,
      `The Focus page is where that happens. Before you kick off, write a one-sentence intention — "I'm going to finish the outline for chapter 3" beats "I'm going to work on my project." Specificity is the secret. The session tracker will log everything and let you reflect afterward. Go get it.`,
    ],
    direct: [
      `Open Focus page. Set intention. Begin.`,
      `Navigate to Focus page. Set intention. Select duration. Start session.`,
      `Focus page: set intention (specific outcome, not topic), select mode, set timer. Begin. Post-session: log reflection immediately while it's fresh.`,
    ],
  },
  general: {
    philosophical: [
      `What is it that brought you here today — a question, a tension, or something you want to hold?`,
      `The best Archive sessions begin with honesty about where you are. Share a goal, a confusion, an insight — and I'll help you turn it into something you can act on.`,
      `The Archive is a space for thinking out loud — not for answers, but for the kind of exploration that produces them. I'm here to reflect, to challenge gently, to help you find the structure inside what feels like noise. Share whatever is true for you right now, and we'll go from there.`,
    ],
    formal: [
      `Please provide your query or objective.`,
      `I'm ready to assist. Share your current objective, question, or area of focus and I will provide a structured response.`,
      `I'm standing by. For best results, please specify: (1) your current objective, (2) any constraints, and (3) your preferred output format. This enables a more precise and actionable response. Alternatively, use the freeform input to explore an idea and I will apply appropriate structure.`,
    ],
    casual: [
      `What's on your mind?`,
      `I'm listening! Share a goal, a question, or whatever you're thinking about. There's no wrong answer here.`,
      `Hey — what's on your mind? The Archive works best when you just start talking. Goals, confusions, random thoughts, half-formed ideas — all of it is useful material. I'll help you turn whatever you bring into something concrete. What's alive for you right now?`,
    ],
    direct: [
      `State your question or objective.`,
      `State your objective or question. I'll respond with the most useful next action.`,
      `Input: question, goal, or problem. Output: structured response with next actions. Use Quests for tasks, Memory for capture, Graph for insight storage, Focus for sessions.`,
    ],
  },
};

// ── Verbosity shaping ─────────────────────────────────────────────────────────

function shapeByVerbosity(variants: ResponseVariant, verbosity: string): string {
  if (verbosity === 'concise') return variants[0];
  if (verbosity === 'verbose') return variants[1] + ' ' + variants[2];
  return variants[1]; // balanced (default)
}

// ── Main generate function ────────────────────────────────────────────────────

export function generateResponse(
  input: string,
  cfg: AIConfigRecord,
  ctx?: AIRequestContext,
): string {
  void ctx; // reserved for future memory/journey injection into real providers
  const topic = detectTopic(input);
  const toneBank = RESPONSES[topic];
  const tone = (cfg.tone ?? 'philosophical') as string;
  const variants: ResponseVariant = toneBank[tone] ?? toneBank['philosophical'];

  let response = shapeByVerbosity(variants, cfg.verbosity ?? 'balanced');

  // Prepend project-focus tag if set and not too intrusive
  if (cfg.projectFocus && cfg.verbosity !== 'concise') {
    response = `[${cfg.projectFocus}] ${response}`;
  }

  return response;
}

// ── Export for future provider integration ────────────────────────────────────
// When wiring a real API, implement this interface:
//
// export interface AIProvider {
//   id: string;
//   generateResponse(input: string, systemPrompt: string): Promise<string>;
// }
//
// Then replace generateResponse() above with:
//   const systemPrompt = buildSystemPrompt(cfg, ctx);
//   return provider.generateResponse(input, systemPrompt);
