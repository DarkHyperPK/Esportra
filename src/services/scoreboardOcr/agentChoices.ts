export interface CatalogAgent {
  uuid: string;
  name: string;
  icon: string | null;
}

/** One agent in the review's picker: a valorant-api agent (by uuid) or one known only by name. */
export interface AgentChoice {
  key: string;
  name: string;
  agentId: string | null;
  icon: string | null;
}

const bundledIcon = (name: string) => `/agents/${name.toLowerCase()}.png`;

/**
 * Every agent the captain can pick: valorant-api's catalog, the agents shipped with the app before the
 * API lists them, and the agent the screenshot read when it is in neither. Alphabetical.
 */
export function agentChoices(catalog: CatalogAgent[], bundled: readonly string[], readName?: string | null): AgentChoice[] {
  const known = new Set(catalog.map((a) => a.name.toLowerCase()));
  const named = [...bundled, ...(readName ? [readName] : [])]
    .filter((name, i, all) => !known.has(name.toLowerCase()) && all.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === i)
    .map((name) => ({
      key: `name:${name}`,
      name,
      agentId: null,
      icon: bundled.some((b) => b.toLowerCase() === name.toLowerCase()) ? bundledIcon(name) : null,
    }));
  const fromCatalog = catalog.map((a) => ({ key: a.uuid, name: a.name, agentId: a.uuid, icon: a.icon }));
  return [...fromCatalog, ...named].sort((a, b) => a.name.localeCompare(b.name));
}

/** The icon for a row's current agent, from the catalog, the bundled set or valorant-api by uuid. */
export function agentIcon(choices: AgentChoice[], agentId: string | null, agentName: string | null): string | null {
  const choice = choices.find((c) => (agentId ? c.agentId === agentId : c.name.toLowerCase() === agentName?.toLowerCase()));
  if (choice?.icon) return choice.icon;
  return agentId ? `https://media.valorant-api.com/agents/${agentId}/displayicon.png` : null;
}
