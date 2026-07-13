import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type PasswordChangeResult =
  | { isSuccess: true }
  | { isSuccess: false; message: string };

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function usePasswordChange() {
  const [isChanging, setIsChanging] = useState(false);

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<PasswordChangeResult> => {
    setIsChanging(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        return { isSuccess: false, message: 'Please sign in again before changing your password.' };
      }

      const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthenticationError) {
        return { isSuccess: false, message: 'Your current password is incorrect.' };
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      return { isSuccess: true };
    } catch (error) {
      return { isSuccess: false, message: getErrorMessage(error, 'Could not update your password.') };
    } finally {
      setIsChanging(false);
    }
  };

  return { changePassword, isChanging };
}