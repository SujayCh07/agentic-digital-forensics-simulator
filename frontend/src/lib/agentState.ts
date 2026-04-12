"use client";

import type {
  AgentId,
  NipsAgentInstance,
  NipsMarketplaceOffer,
} from "@/types/investigation";

export const ROLE_ORDER: AgentId[] = ["logis", "nexus", "filer", "chrono"];

export interface AgentStateModel {
  roleUnlocks: Record<AgentId, boolean>;
  lockedRoles: AgentId[];
  ownedAgents: NipsAgentInstance[];
  ownedAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>;
  ownedRoleIds: AgentId[];
  deployedAgents: NipsAgentInstance[];
  deployedAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>;
  deployedRoleIds: AgentId[];
  offersByRole: Partial<Record<AgentId, NipsMarketplaceOffer>>;
  slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>;
}

export function toAgentId(value: string): AgentId | null {
  const normalized = value.trim().toLowerCase();
  return ROLE_ORDER.includes(normalized as AgentId)
    ? (normalized as AgentId)
    : null;
}

function preferAgent(
  current: NipsAgentInstance | undefined,
  candidate: NipsAgentInstance,
) {
  if (!current) return candidate;
  if (candidate.created_at !== current.created_at) {
    return candidate.created_at > current.created_at ? candidate : current;
  }
  return candidate.instance_id > current.instance_id ? candidate : current;
}

export function normalizeOwnedAgents(
  agents: NipsAgentInstance[],
): NipsAgentInstance[] {
  const byRole: Partial<Record<AgentId, NipsAgentInstance>> = {};

  for (const agent of agents) {
    const roleId = toAgentId(agent.archetype);
    if (!roleId) continue;
    byRole[roleId] = preferAgent(byRole[roleId], agent);
  }

  return ROLE_ORDER.map((roleId) => byRole[roleId]).filter(
    (agent): agent is NipsAgentInstance => Boolean(agent),
  );
}

export function buildAgentStateModel({
  ownedAgents,
  marketplaceOffers,
  baseLockedRoles,
}: {
  ownedAgents: NipsAgentInstance[];
  marketplaceOffers: NipsMarketplaceOffer[];
  baseLockedRoles: AgentId[];
}): AgentStateModel {
  const normalizedOwnedAgents = normalizeOwnedAgents(ownedAgents);
  const ownedAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>> = {};

  for (const agent of normalizedOwnedAgents) {
    const roleId = toAgentId(agent.archetype);
    if (!roleId) continue;
    ownedAgentsByRole[roleId] = agent;
  }

  const offersByRole: Partial<Record<AgentId, NipsMarketplaceOffer>> = {};
  for (const offer of marketplaceOffers) {
    const roleId = toAgentId(offer.agent.archetype);
    if (!roleId || ownedAgentsByRole[roleId] || offersByRole[roleId]) continue;
    offersByRole[roleId] = offer;
  }

  const roleUnlocks = ROLE_ORDER.reduce<Record<AgentId, boolean>>(
    (acc, roleId) => {
      acc[roleId] =
        Boolean(ownedAgentsByRole[roleId]) || !baseLockedRoles.includes(roleId);
      return acc;
    },
    {
      logis: false,
      nexus: false,
      filer: false,
      chrono: false,
    },
  );

  const lockedRoles = ROLE_ORDER.filter((roleId) => !roleUnlocks[roleId]);
  const ownedRoleIds = ROLE_ORDER.filter((roleId) => Boolean(ownedAgentsByRole[roleId]));

  const deployedAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>> = {};
  for (const roleId of ROLE_ORDER) {
    if (!roleUnlocks[roleId]) continue;
    const ownedAgent = ownedAgentsByRole[roleId];
    if (ownedAgent) {
      deployedAgentsByRole[roleId] = ownedAgent;
    }
  }

  const deployedRoleIds = ROLE_ORDER.filter((roleId) =>
    Boolean(deployedAgentsByRole[roleId]),
  );
  const deployedAgents = deployedRoleIds
    .map((roleId) => deployedAgentsByRole[roleId])
    .filter((agent): agent is NipsAgentInstance => Boolean(agent));

  const slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>> = {};
  for (const roleId of ROLE_ORDER) {
    slotAgentsByRole[roleId] = ownedAgentsByRole[roleId] ?? offersByRole[roleId]?.agent;
  }

  return {
    roleUnlocks,
    lockedRoles,
    ownedAgents: normalizedOwnedAgents,
    ownedAgentsByRole,
    ownedRoleIds,
    deployedAgents,
    deployedAgentsByRole,
    deployedRoleIds,
    offersByRole,
    slotAgentsByRole,
  };
}
