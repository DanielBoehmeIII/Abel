import type { TierId } from './types';
import { db } from '../db';

const iso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface Team {
  id: string;
  ownerUserId: string;
  name: string;
  tierId: TierId;
  seatCount: number;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'admin' | 'member';
  addedAt: string;
}

export interface TeamUsagePool {
  teamId: string;
  billingPeriod: string;
  pooledInputTokens: number;
  pooledOutputTokens: number;
  allocatedByMember: Array<{ userId: string; inputTokens: number; outputTokens: number }>;
}

export async function createTeam(ownerUserId: string, name: string, tierId: TierId): Promise<Team> {
  const team: Team = {
    id: `team-${uid()}`,
    ownerUserId,
    name,
    tierId,
    seatCount: 1,
    memberIds: [ownerUserId],
    createdAt: iso(),
    updatedAt: iso(),
  };
  await db.table('teams').put(team);
  return team;
}

export async function addTeamMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
  const member: TeamMember = {
    id: `tm-${uid()}`,
    teamId,
    userId,
    role,
    addedAt: iso(),
  };
  await db.table('teamMembers').put(member);
  const team = await db.table('teams').get(teamId) as Team | undefined;
  if (team) {
    team.memberIds.push(userId);
    team.seatCount = team.memberIds.length;
    team.updatedAt = iso();
    await db.table('teams').put(team);
  }
}

export async function getTeamUsagePool(teamId: string, billingPeriod: string): Promise<TeamUsagePool> {
  const members = await db.table('teamMembers').where('teamId').equals(teamId).toArray() as TeamMember[];
  const usageEvents = await db.usageEvents
    .where('createdAt')
    .above(billingPeriod)
    .toArray();

  const allocatedByMember: Array<{ userId: string; inputTokens: number; outputTokens: number }> = [];
  let pooledInput = 0, pooledOutput = 0;

  for (const member of members) {
    const memberEvents = usageEvents.filter(e => e.userId === member.userId);
    const input = memberEvents.reduce((s, e) => s + e.inputTokens, 0);
    const output = memberEvents.reduce((s, e) => s + e.outputTokens, 0);
    pooledInput += input;
    pooledOutput += output;
    allocatedByMember.push({ userId: member.userId, inputTokens: input, outputTokens: output });
  }

  return { teamId, billingPeriod, pooledInputTokens: pooledInput, pooledOutputTokens: pooledOutput, allocatedByMember };
}

declare module '../db/db' {
  interface AbelDatabase {
    teams: import('dexie').Table<Team, string>;
    teamMembers: import('dexie').Table<TeamMember, string>;
  }
}
