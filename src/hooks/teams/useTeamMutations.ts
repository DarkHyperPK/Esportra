import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';

// Define the payload structure based on our plan
export interface EditTeamPayload {
    teamId: string;
    name?: string;
    tag?: string;
    description?: string;
    game?: string;
    game_format?: string;
    social_media?: Record<string, string>;
    logoFile?: File;
    bannerFile?: Blob | File; // Can be a Blob from the cropper or a File
    currentLogoUrl?: string; // To know if we need to replace/update
    currentBannerUrl?: string;
}

export const useTeamMutations = () => {
    const queryClient = useQueryClient();

    const editTeam = useMutation({
        mutationFn: async (payload: EditTeamPayload) => {
            const {
                teamId,
                logoFile,
                bannerFile,
                currentLogoUrl,
                currentBannerUrl,
                ...updateData
            } = payload;

            let newLogoUrl = currentLogoUrl;
            let newBannerUrl = currentBannerUrl;

            // Handle Logo Upload
            if (logoFile) {
                const sanitizedTeamName = payload.name?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'team';
                const fileExt = logoFile.name ? logoFile.name.split('.').pop() : 'png';
                const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${sanitizedTeamName}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('teams.logos')
                    .upload(filePath, logoFile);

                if (uploadError) {
                    throw new Error(`Failed to upload logo: ${uploadError.message}`);
                }

                const { data: urlData } = supabase.storage
                    .from('teams.logos')
                    .getPublicUrl(filePath);

                newLogoUrl = urlData.publicUrl;
            }

            // Handle Banner Upload
            if (bannerFile) {
                const sanitizedTeamName = payload.name?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'team';
                // If it's a blob from the cropper, we might not have a .name, default to jpeg
                const fileExt = bannerFile instanceof File ? (bannerFile.name.split('.').pop() || 'jpeg') : 'jpeg';
                const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${sanitizedTeamName}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('teams.logos') // Using the same bucket since it handles team media based on current app state
                    .upload(filePath, bannerFile);

                if (uploadError) {
                    // Fallback to organizer-media if teams.logos fails due to RLS restricting non-logo files
                    if (uploadError.message.includes('row-level security policy') || uploadError.message.includes('new row violates row-level security')) {
                        console.warn('Falling back to organizer-media for banner upload due to RLS on teams.logos');
                        const fallbackPath = `${teamId}/${fileName}`; // Use teamId for isolation in organizer-media
                        const { error: fallbackUploadError } = await supabase.storage
                            .from('organizer-media')
                            .upload(fallbackPath, bannerFile);

                        if (fallbackUploadError) throw new Error(`Failed to upload banner: ${fallbackUploadError.message}`);

                        const { data: urlData } = supabase.storage
                            .from('organizer-media')
                            .getPublicUrl(fallbackPath);

                        newBannerUrl = urlData.publicUrl;
                    } else {
                        throw new Error(`Failed to upload banner: ${uploadError.message}`);
                    }
                } else {
                    const { data: urlData } = supabase.storage
                        .from('teams.logos')
                        .getPublicUrl(filePath);

                    newBannerUrl = urlData.publicUrl;
                }
            }

            // Update the Database Record
            const finalUpdateData = {
                ...updateData,
                ...(newLogoUrl !== currentLogoUrl ? { logo_url: newLogoUrl } : {}),
                ...(newBannerUrl !== currentBannerUrl ? { banner_url: newBannerUrl } : {}),
                updated_at: new Date().toISOString(),
            };

            const data = await apiClient.put(`/api/teams/${teamId}`, finalUpdateData);
            return data;
        },
        onSuccess: (data, variables) => {
            // Invalidate both individual team and the list of user teams
            queryClient.invalidateQueries({ queryKey: ['team', variables.teamId] });
            queryClient.invalidateQueries({ queryKey: ['user_teams'] });
        },
    });

    return { editTeam };
};
