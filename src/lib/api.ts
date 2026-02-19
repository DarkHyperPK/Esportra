/**
 * API Client - Fetches data from Supabase for admin dashboard
 */

import { supabase } from './supabase';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface AdminStats {
    totalUsers: number;
    activeVenues: number;
    activeTournaments: number;
    totalRevenue: number;
}

class ApiClient {
    async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            if (endpoint === '/admin/stats') {
                // Fetch real counts from Supabase
                const [usersResult, venuesResult, tournamentsResult] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('venues').select('*', { count: 'exact', head: true }),
                    supabase.from('tournaments').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'ongoing']),
                ]);

                const stats: AdminStats = {
                    totalUsers: usersResult.count || 0,
                    activeVenues: venuesResult.count || 0,
                    activeTournaments: tournamentsResult.count || 0,
                    totalRevenue: 0, // Revenue tracking not implemented yet
                };

                return { success: true, data: stats as T };
            }

            return { success: false, error: `Unknown endpoint: ${endpoint}` };
        } catch (error) {
            console.error(`API Error [GET ${endpoint}]:`, error);
            return { success: false, error: String(error) };
        }
    }

    async post<T = unknown>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        console.warn(`POST ${endpoint} not implemented`, body);
        return { success: false, error: 'Not implemented' };
    }
}

const apiClient = new ApiClient();
export default apiClient;
