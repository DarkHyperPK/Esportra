export const MAP_THEMES: Record<string, { color: string; bg: string; id: string }> = {
    'haven': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', id: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047' },
    'bind': { color: 'text-amber-400', bg: 'bg-amber-500/10', id: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba' },
    'ascent': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319' },
    'split': { color: 'text-indigo-400', bg: 'bg-indigo-500/10', id: 'd960549e-485c-e861-8d71-aa9d1aed12a2' },
    'icebox': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', id: 'e2ad5c54-4114-a870-9641-8ea21279579a' },
    'breeze': { color: 'text-rose-400', bg: 'bg-rose-500/10', id: '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53' },
    'fracture': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', id: 'b529448b-4d60-346e-e89e-00a4c527a405' },
    'lotus': { color: 'text-orange-400', bg: 'bg-orange-500/10', id: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9' },
    'sunset': { color: 'text-purple-400', bg: 'bg-purple-500/10', id: '92584fbe-486a-b1b2-9faa-39b0f486b498' },
    'juliett': { color: 'text-purple-400', bg: 'bg-purple-500/10', id: '92584fbe-486a-b1b2-9faa-39b0f486b498' },
    'abyss': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '224b0a95-48b9-f703-1bd8-67aca101a61f' },
    'infinity': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '224b0a95-48b9-f703-1bd8-67aca101a61f' },
    'corrode': { color: 'text-zinc-400', bg: 'bg-zinc-500/10', id: '1c18ab1f-420d-0d8b-71d0-77ad3c439115' },
    'rook': { color: 'text-zinc-400', bg: 'bg-zinc-500/10', id: '1c18ab1f-420d-0d8b-71d0-77ad3c439115' },
    'pearl': { color: 'text-teal-400', bg: 'bg-teal-500/10', id: 'fd267378-4d1d-484f-ff52-77821ed10dc2' }
};

export const getAgentIcon = (characterId: string | number) => `https://media.valorant-api.com/agents/${characterId}/displayicon.png`;
export const getMapSplash = (mapId: string) => `https://media.valorant-api.com/maps/${mapId}/splash.png`;
