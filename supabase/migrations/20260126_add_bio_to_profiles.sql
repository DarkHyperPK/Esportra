-- Add bio column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio text;

-- Add comment
COMMENT ON COLUMN profiles.bio IS 'User biography or description';

-- Ensure RLS allows existing update policy to cover this column
-- (Usually standard UPDATE policies cover all columns, but good to check if there are specific column restrictions. 
-- Assuming standard "Users can update their own profile" policy exists.)
