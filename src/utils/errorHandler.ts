import { toast } from '@/hooks/use-toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class TournamentError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, 400, details);
    this.name = 'TournamentError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, 401, details);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code: string, details?: unknown) {
    super(message, code, 500, details);
    this.name = 'DatabaseError';
  }
}

type UnknownError = {
  name?: string;
  message?: string;
  code?: string;
  details?: unknown;
  statusCode?: number;
};

export const handleError = (error: unknown, showToast = true) => {
  
  // Log the error for debugging
  const err = (error as UnknownError) || {};
  console.error('Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    details: err.details
  });

  // Handle specific error types
  if (error instanceof TournamentError) {
    if (showToast) {
      toast({
        title: 'Tournament Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    return error;
  }

  if (error instanceof AuthError) {
    if (showToast) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    return error;
  }

  if (error instanceof DatabaseError) {
    if (showToast) {
      toast({
        title: 'Database Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    return error;
  }

  // Handle Supabase errors
  if ((err.code as string | undefined)?.startsWith('PGRST')) {
    const dbError = new DatabaseError(
      err.message || 'Database error',
      err.code || 'PGRST',
      err.details
    );
    if (showToast) {
      toast({
        title: 'Database Error',
        description: dbError.message,
        variant: 'destructive',
      });
    }
    return dbError;
  }

  // Handle generic errors
  if (showToast) {
    toast({
      title: 'Error',
      description: err.message || 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
  return new AppError(
    err.message || 'An unexpected error occurred',
    err.code || 'UNKNOWN_ERROR',
    err.statusCode,
    err.details
  );
}; 