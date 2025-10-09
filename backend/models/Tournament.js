const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  
  // Game Info
  game: {
    type: String,
    required: true,
    trim: true
  },
  format: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'custom'],
    required: true
  },
  
  // Tournament Settings
  maxTeams: {
    type: Number,
    required: true,
    min: 2,
    max: 1000
  },
  minTeams: {
    type: Number,
    default: 2,
    min: 2
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  prizePool: {
    type: Number,
    default: 0,
    min: 0
  },
  prizeDistribution: [{
    position: Number,
    percentage: Number,
    amount: Number
  }],
  
  // Schedule
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'check_in', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Rules & Requirements
  rules: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  requirements: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  ageRestriction: {
    min: Number,
    max: Number
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional', 'all'],
    default: 'all'
  },
  
  // Visual
  banner: {
    type: String,
    default: null
  },
  logo: {
    type: String,
    default: null
  },
  
  // Organization
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    default: null
  },
  
  // Participants
  participants: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'checked_in', 'eliminated', 'disqualified'],
      default: 'registered'
    },
    seed: Number,
    finalPosition: Number
  }],
  
  // Bracket/Matches
  bracket: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  matches: [{
    id: String,
    round: Number,
    matchNumber: Number,
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    score1: Number,
    score2: Number,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    scheduledTime: Date,
    completedAt: Date,
    streamUrl: String
  }],
  
  // Settings
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  allowSpectators: {
    type: Boolean,
    default: true
  },
  streamUrl: String,
  
  // Stats
  stats: {
    totalRegistrations: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    }
  },
  
  // Admin
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes
tournamentSchema.index({ name: 1 });
tournamentSchema.index({ game: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ organizer: 1 });
tournamentSchema.index({ startDate: 1 });
tournamentSchema.index({ isFeatured: 1 });
tournamentSchema.index({ isPublic: 1 });

// Virtual for registration count
tournamentSchema.virtual('registrationCount').get(function() {
  return this.participants.filter(p => p.status === 'registered' || p.status === 'checked_in').length;
});

// Virtual for available spots
tournamentSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.maxTeams - this.registrationCount);
});

// Virtual for registration status
tournamentSchema.virtual('registrationStatus').get(function() {
  const now = new Date();
  if (now < this.registrationDeadline) {
    return this.registrationCount >= this.maxTeams ? 'full' : 'open';
  }
  return 'closed';
});

// Check if team can register
tournamentSchema.methods.canRegister = function(teamId) {
  const now = new Date();
  
  // Check if registration is open
  if (now >= this.registrationDeadline) return false;
  if (this.status !== 'open') return false;
  if (this.registrationCount >= this.maxTeams) return false;
  
  // Check if team is already registered
  const isRegistered = this.participants.some(p => 
    p.team.toString() === teamId.toString()
  );
  
  return !isRegistered;
};

// Register team
tournamentSchema.methods.registerTeam = function(teamId) {
  if (!this.canRegister(teamId)) {
    throw new Error('Cannot register team');
  }
  
  this.participants.push({
    team: teamId,
    registeredAt: new Date(),
    status: 'registered'
  });
  
  this.stats.totalRegistrations += 1;
};

// Check if user can manage tournament
tournamentSchema.methods.canManage = function(userId) {
  return this.organizer.toString() === userId.toString();
};

// Get tournament status
tournamentSchema.methods.getStatus = function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'completed';
  
  if (now < this.registrationDeadline) {
    return this.registrationCount >= this.maxTeams ? 'full' : 'open';
  }
  
  if (now < this.startDate) {
    return 'closed';
  }
  
  if (now >= this.startDate && now < this.endDate) {
    return 'ongoing';
  }
  
  return 'completed';
};

module.exports = mongoose.model('Tournament', tournamentSchema);
