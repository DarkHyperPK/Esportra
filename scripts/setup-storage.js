import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function setupStorage() {
  try {
    // Create the tournament-assets bucket if it doesn't exist
    const { data: tournamentBucket, error: tournamentBucketError } = await supabase
      .storage
      .createBucket('tournament-assets', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

    if (tournamentBucketError) {
      if (tournamentBucketError.message.includes('already exists')) {
        console.log('Bucket tournament-assets already exists');
      } else {
        console.error('Error creating tournament-assets bucket:', tournamentBucketError);
      }
    } else {
      console.log('Created bucket tournament-assets');
    }

    // Create the team-logos bucket if it doesn't exist
    const { data: teamLogosBucket, error: teamLogosBucketError } = await supabase
      .storage
      .createBucket('team-logos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

    if (teamLogosBucketError) {
      if (teamLogosBucketError.message.includes('already exists')) {
        console.log('Bucket team-logos already exists');
      } else {
        console.error('Error creating team-logos bucket:', teamLogosBucketError);
      }
    } else {
      console.log('Created bucket team-logos');
    }

    console.log('Storage setup completed successfully');
  } catch (error) {
    console.error('Error setting up storage:', error);
    process.exit(1);
  }
}

setupStorage(); 