import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Why a file can't be attached, or null. Checked before the upload so a bad file fails instantly. */
export function validateEvidenceFile(file: File): string | null {
  if (!TYPES.includes(file.type)) return 'Attach a PNG, JPG or WebP image.';
  if (file.size > MAX_BYTES) return 'Images must be 10 MB or smaller.';
  return null;
}

/** Uploads one evidence image for a scrim dispute and returns its public URL. */
export function useDisputeEvidenceUpload(sessionId: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const invalid = validateEvidenceFile(file);
      if (invalid) throw new Error(invalid);
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.upload<{ url: string }>(`/api/scrims/sessions/${sessionId}/dispute/evidence/upload`, form);
      return res.url;
    },
  });
}
