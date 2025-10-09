const fs = require('fs');
const path = require('path');

// List of pages that should have Navbar removed (since it's now global)
const pagesToFix = [
  'src/pages/tournaments/Details.tsx',
  'src/pages/tournaments/Edit.tsx',
  'src/pages/tournaments/List.tsx',
  'src/pages/tournaments/Brackets.tsx',
  'src/pages/tournaments/Create.tsx',
  'src/pages/tournaments/[id].tsx',
  'src/pages/venues/Featured.tsx',
  'src/pages/venues/Search.tsx',
  'src/pages/venues/Details.tsx',
  'src/pages/venues/ListVenue.tsx',
  'src/pages/about/Company.tsx',
  'src/pages/about/Contact.tsx',
  'src/pages/about/FAQ.tsx',
  'src/pages/auth/Profile.tsx',
  'src/pages/auth/SignIn.tsx',
  'src/pages/auth/SignUp.tsx',
  'src/pages/user/Dashboard.tsx',
  'src/pages/player/Dashboard.tsx',
  'src/pages/organizer/Dashboard.tsx',
  'src/pages/organizer/ManageTournaments.tsx',
  'src/pages/organizer/TournamentList.tsx',
  'src/pages/organizer/TournamentManage.tsx',
  'src/pages/organizer/TournamentBrackets.tsx',
  'src/pages/venue-owner/Dashboard.tsx',
  'src/pages/admin/Dashboard.tsx',
  'src/pages/admin/ManageUsers.tsx',
  'src/pages/TournamentHistory.tsx',
  'src/pages/Unauthorized.tsx',
  'src/pages/AppDownload.tsx'
];

function fixNavbarInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove Navbar import
    if (content.includes("import Navbar from '@/components/Navbar';")) {
      content = content.replace(/import Navbar from '@\/components\/Navbar';\n?/g, '');
      modified = true;
    }

    // Remove <Navbar /> component usage
    if (content.includes('<Navbar />')) {
      content = content.replace(/<Navbar \/>\n?\s*/g, '');
      modified = true;
    }

    // Also remove any Navbar with props
    if (content.includes('<Navbar')) {
      content = content.replace(/<Navbar[^>]*\/>\n?\s*/g, '');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
    } else {
      console.log(`No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix all files
pagesToFix.forEach(fixNavbarInFile);

console.log('Navbar removal complete!');
