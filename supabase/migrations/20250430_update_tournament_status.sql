-- Update existing tournaments with appropriate status based on date
UPDATE public.tournaments
SET status = CASE
    WHEN date > CURRENT_DATE THEN 'upcoming'
    WHEN date = CURRENT_DATE THEN 'ongoing'
    ELSE 'completed'
END
WHERE status IS NULL; 