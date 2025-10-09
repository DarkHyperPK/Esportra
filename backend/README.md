# Frag and Book - Backend API

A Node.js backend API for the Frag and Book gaming platform, built with Express.js and MongoDB.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
1. Copy `config.env` to `.env`
2. Update the MongoDB connection string with your Atlas credentials
3. Set a strong JWT secret
4. Configure Cloudinary for file uploads (optional)

### 3. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── models/           # MongoDB schemas
│   ├── User.js
│   ├── Team.js
│   ├── Tournament.js
│   └── VerificationRequest.js
├── routes/           # API routes
│   ├── auth.js
│   ├── users.js
│   ├── teams.js
│   ├── tournaments.js
│   ├── venues.js
│   ├── verification.js
│   └── admin.js
├── middleware/       # Custom middleware
│   └── auth.js
├── utils/           # Utility functions
├── server.js        # Main server file
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### Verification
- `POST /api/verification/submit` - Submit verification request
- `GET /api/verification/my-requests` - Get user's requests
- `GET /api/verification/:id` - Get request details
- `GET /api/verification/admin/all` - Get all requests (admin)
- `PUT /api/verification/:id/approve` - Approve request (admin)
- `PUT /api/verification/:id/reject` - Reject request (admin)

### Teams
- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/:id` - Get tournament details
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Admin
- `GET /api/admin/stats` - Get admin dashboard stats

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Models

### User
- Basic profile information
- Role system (casual, organizer, venue_owner, admin)
- Admin permissions and roles
- Account status (suspended, banned)
- Gaming profile and achievements

### Team
- Team information and settings
- Member management
- Invite system
- Statistics and achievements

### Tournament
- Tournament details and settings
- Participant management
- Bracket system
- Prize distribution

### VerificationRequest
- KYC information
- Document uploads
- Admin review system
- Status tracking

## 🛡️ Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS protection
- Admin role-based access control

## 📝 Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🚀 Deployment

1. Set up MongoDB Atlas cluster
2. Configure environment variables
3. Deploy to your preferred platform (Heroku, Railway, etc.)
4. Update CORS settings for production domain

## 📞 Support

For issues or questions, please check the documentation or contact the development team.
