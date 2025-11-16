# Frag & Book - Esports Tournament Platform

A comprehensive esports tournament management platform built with React, TypeScript, and Supabase.

## 🚀 Features

### For Players
- **Team Management**: Create teams, manage rosters for multiple games
- **Tournament Registration**: Register teams for tournaments
- **Roster System**: Multi-game roster support (max 3 rosters per team)
- **Team Invitations**: Invite members via email with notification system
- **Match Results**: Upload match results with screenshots
- **Live Matches**: View party codes for live tournament matches
- **Dispute System**: Raise disputes with evidence upload

### For Organizers
- **Tournament Creation**: Create and manage tournaments
- **Bracket Generation**: Automatic bracket generation with scheduling
- **Match Management**: Edit matches, set schedules, manage live matches
- **Ban Management**: Ban teams/players from tournaments
- **Dispute Resolution**: Review and resolve player disputes
- **Team Overview**: View all registered teams and their members
- **Live Match Control**: Set party codes for live matches

### For Admins
- **User Management**: Complete user administration system
- **System Settings**: Platform-wide configuration
- **Role Management**: Manage user roles and permissions

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Routing**: React Router DOM
- **State Management**: React Context + React Query
- **Build Tool**: Vite
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and auth)
- Git (for version control)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/frag-and-book.git
   cd frag-and-book
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run migrations from `supabase/migrations/` in order
   - Apply all migration files via Supabase SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
frag-and-book/
├── src/
│   ├── components/      # React components
│   │   ├── admin/       # Admin-specific components
│   │   ├── organizer/   # Organizer components
│   │   ├── player/      # Player components
│   │   ├── tournament/  # Tournament-related components
│   │   └── ui/          # shadcn/ui components
│   ├── contexts/        # React contexts (Auth, Role, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── supabase/
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── backend/             # Express backend (optional)
```

## 🗄️ Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- `profiles` - User profiles
- `teams` - Team/organization data
- `team_rosters` - Game-specific rosters
- `team_roster_members` - Roster memberships
- `team_invitations` - Team invitations
- `tournaments` - Tournament data
- `tournament_participants` - Tournament registrations
- `tournament_matches` - Match brackets
- `tournament_match_results` - Submitted match results
- `tournament_disputes` - Dispute submissions
- `tournament_bans` - Tournament bans
- `notifications` - User notifications

See `supabase/migrations/` for complete schema definitions.

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Hostinger:

```bash
# Build for production
npm run build

# Upload dist/ folder to Hostinger public_html/
```

### Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically

## 🔐 Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Optional (for production):

```env
VITE_API_BASE_URL=your_backend_api_url  # If using separate backend
```

## 📝 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally**
   ```bash
   npm run dev
   ```

3. **Commit changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** on GitHub

## 🧪 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 📚 Key Features Documentation

### Roster System
Teams can create multiple rosters (max 3) for different games. Each roster is game-specific and can have different members. See `ROSTER_ORGANIZATION_MODEL.md` for details.

### Tournament Registration
Teams register specific rosters for tournaments. The system validates:
- Roster exists for tournament game
- Roster has required number of members
- Team captain eligibility

### Bracket System
- Automatic bracket generation from registrations
- Supports 8, 16, 24, 32 team brackets
- Match scheduling and live match management
- Real-time synchronization via Supabase Realtime

### Authentication & Roles
- Multi-role system: Player, Organizer, Admin
- Role-based access control (RBAC)
- Secure authentication via Supabase Auth

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license here]

## 🔗 Links

- [Live Demo](https://yourdomain.com)
- [Documentation](./DEPLOYMENT_GUIDE.md)
- [Supabase Setup](./SUPABASE_SETUP.md)

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review migration files for database setup

## 🎯 Roadmap

- [ ] Mobile app (Capacitor ready)
- [ ] Advanced analytics
- [ ] Payment integration
- [ ] Stream integration
- [ ] Tournament templates

---

Built with ❤️ using React, TypeScript, and Supabase
