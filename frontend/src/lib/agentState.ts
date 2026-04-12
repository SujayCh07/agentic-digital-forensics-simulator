import type {
  AgentId,
  NipsAgentInstance,
  NipsMarketplaceOffer,
  NipsArchetype,
} from "@/types/investigation";

/**
 * The priority order for displaying agent roles in the UI.
 */
export const ROLE_ORDER: AgentId[] = ["logis", "nexus", "filer", "chrono"];

/**
 * Maps a NIPS backend archetype string to a frontend AgentId.
 */
export function toAgentId(archetype: string | undefined): AgentId | null {
  if (!archetype) return null;
  const lower = archetype.toLowerCase();
  if (lower.startsWith("logis")) return "logis";
  if (lower.startsWith("nexus")) return "nexus";
  if (lower.startsWith("filer")) return "filer";
  if (lower.startsWith("chrono")) return "chrono";
  return null;
}

/**
 * Normalizes agent instances from the backend into a consistent format.
 * Ensures that archetype is upper-cased for UI consistency.
 */
export function normalizeOwnedAgents(agents: any[]): NipsAgentInstance[] {
  if (!agents) return [];
  return agents.map((a) => ({
    ...a,
    archetype: (a.archetype || "").toUpperCase() as NipsArchetype,
  }));
}

export interface AgentStateModel {
  ownedRoleIds: AgentId[];
  slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>;
  deployedAgents: NipsAgentInstance[];
  lockedRoles: AgentId[];
}

/**
 * Aggregates information about owned agents and marketplace offers to determine
 * which roles are currently filled, locked, or recruitable.
 */
export function buildAgentStateModel({
  ownedAgents,
  marketplaceOffers,
  baseLockedRoles,
}: {
  ownedAgents: NipsAgentInstance[];
  marketplaceOffers: NipsMarketplaceOffer[];
  baseLockedRoles: AgentId[];
}): AgentStateModel {
  const slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>> = {};
  const ownedRoleIds: AgentId[] = [];

  // Populate owned agents into slots
  ownedAgents.forEach((agent) => {
    const roleId = toAgentId(agent.archetype);
    if (roleId) {
      // If multiple agents of same role exist, pick the one already in the slot or just use latest
      slotAgentsByRole[roleId] = agent;
      if (!ownedRoleIds.includes(roleId)) {
        ownedRoleIds.push(roleId);
      }
    }
  });

  // Locked roles are those in baseLockedRoles that we don't own yet
  const lockedRoles = baseLockedRoles.filter((roleId) => !ownedRoleIds.includes(roleId));

  // Determine which agents are actually "deployed" (in a slot)
  const deployedAgents = ROLE_ORDER.map((roleId) => slotAgentsByRole[roleId]).filter(
    Boolean,
  ) as NipsAgentInstance[];

  return {
    ownedRoleIds,
    slotAgentsByRole,
    deployedAgents,
    lockedRoles,
  };
}
