import { useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { SingleEliminationGenerator } from '@/services/bracket/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '@/services/bracket/DoubleEliminationGenerator';
import { normalizeToolBracketPayload, type PublicBracketPayload } from '@/pages/tools/publicToolUtils';
import { TOOL_BRACKETS_MINE_KEY } from './useToolBrackets';

export type BracketBuildRequest = {
    title: string;
    format: 'single_elimination' | 'double_elimination';
    teams: string[];
    bestOf: number;
    bracketSize: number;
};

const MAX_TEAM_FILE_BYTES = 256 * 1024;
const TEAM_FILE_EXTENSIONS = ['.txt', '.csv'];
const TEAM_FILE_TYPES = ['', 'text/plain', 'text/csv', 'application/vnd.ms-excel'];

/** Reads a pasted-list file after checking extension, type and size. Throws a readable Error otherwise. */
export async function readTeamFile(file: File): Promise<{ text: string; csv: boolean }> {
    const name = file.name.toLowerCase();
    if (!TEAM_FILE_EXTENSIONS.some((ext) => name.endsWith(ext)) || !TEAM_FILE_TYPES.includes(file.type)) {
        throw new Error('Use a .txt or .csv file with one team per line.');
    }
    if (file.size > MAX_TEAM_FILE_BYTES) throw new Error('That file is over 256 KB. A team list should be much smaller.');
    return { text: await file.text(), csv: name.endsWith('.csv') };
}

function localPreview(request: BracketBuildRequest): PublicBracketPayload {
    const teams = request.teams.map((name, index) => ({ id: crypto.randomUUID(), name, seed: index + 1 }));
    const generator = request.format === 'double_elimination' ? new DoubleEliminationGenerator() : new SingleEliminationGenerator();
    return {
        title: request.title.trim() || 'Untitled bracket',
        format: request.format,
        bestOf: request.bestOf,
        bracketSize: request.bracketSize,
        teams,
        graph: generator.generate(teams, 'public-tool-preview', undefined, request.bestOf, request.bracketSize),
    };
}

/** Preview and save for the bracket builder. Preview falls back to this device if the service is missing. */
export function useToolBracketBuilder() {
    const queryClient = useQueryClient();

    return {
        preview: async (request: BracketBuildRequest): Promise<{ payload: PublicBracketPayload; local: boolean }> => {
            try {
                const response = await apiClient.post<Record<string, unknown>>('/api/tools/brackets/preview', request);
                return { payload: normalizeToolBracketPayload(response), local: false };
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) return { payload: localPreview(request), local: true };
                throw error;
            }
        },
        /** Returns the new bracket's id, or null when the person must sign in first. */
        save: async (request: BracketBuildRequest): Promise<string | null> => {
            try {
                const response = await apiClient.post<{ id: string }>('/api/tools/brackets', request);
                await queryClient.invalidateQueries({ queryKey: TOOL_BRACKETS_MINE_KEY });
                return response.id;
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) return null;
                throw error;
            }
        },
    };
}
