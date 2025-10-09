const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  tag: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Gaming Info
  game: {
    type: String,
    required: true,
    trim: true
  },
  games: [{
    type: String,
    trim: true
  }],
  gameFormat: {
    type: String,
    enum: ['solo', 'duo', 'squad', 'custom'],
    default: 'squad'
  },
  
  // Visual
  logo: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  
  // Contact & Social
  website: String,
  socialMedia: {
    discord: String,
    twitter: String,
    twitch: String,
    youtube: String
  },
  
  // Team Stats
  achievements: [{
    title: String,
    description: String,
    tournament: String,
    date: Date,
    prize: Number
  }],
  
  // Settings
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Members
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'captain', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Invites
  invites: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  }],
  
  // Stats
  stats: {
    totalMatches: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    totalPrizeMoney: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ tag: 1 });
teamSchema.index({ game: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ isActive: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for win rate calculation
teamSchema.virtual('calculatedWinRate').get(function() {
  if (this.stats.totalMatches === 0) return 0;
  return Math.round((this.stats.wins / this.stats.totalMatches) * 100);
});

// Update win rate before saving
teamSchema.pre('save', function(next) {
  if (this.stats.totalMatches > 0) {
    this.stats.winRate = this.calculatedWinRate;
  }
  next();
});

// Check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Check if user is owner
teamSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

// Check if user can manage team
teamSchema.methods.canManage = function(userId) {
  return this.isOwner(userId) || 
         this.members.some(member => 
           member.user.toString() === userId.toString() && 
           member.role === 'captain' && 
           member.isActive
         );
};

// Add member to team
teamSchema.methods.addMember = function(userId, role = 'member') {
  if (this.memberCount >= this.maxMembers) {
    throw new Error('Team is full');
  }
  
  if (this.isMember(userId)) {
    throw new Error('User is already a member');
  }
  
  this.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
    isActive: true
  });
};

// Remove member from team
teamSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(member => 
    member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member');
  }
  
  this.members[memberIndex].isActive = false;
};

module.exports = mongoose.model('Team', teamSchema);
