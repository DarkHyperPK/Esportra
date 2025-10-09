const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Role System
  role: {
    type: String,
    enum: ['casual', 'organizer', 'venue_owner', 'admin'],
    default: 'casual'
  },
  
  // Admin System
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminRoles: [{
    type: String,
    enum: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin']
  }],
  adminPermissions: [String],
  
  // User Management
  isSuspended: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspensionUntil: Date,
  banReason: String,
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified'],
    default: 'unverified'
  },
  
  // Gaming Profile
  gamingProfile: {
    favoriteGames: [String],
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional'],
      default: 'beginner'
    },
    achievements: [{
      title: String,
      description: String,
      earnedAt: Date
    }]
  },
  
  // Social Links
  socialLinks: {
    discord: String,
    twitter: String,
    twitch: String,
    youtube: String,
    website: String
  },
  
  // Timestamps
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isAdmin: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

// Check if user has admin permission
userSchema.methods.hasPermission = function(permission) {
  if (!this.isAdmin) return false;
  if (this.adminRoles.includes('super_admin')) return true;
  return this.adminPermissions && this.adminPermissions.includes(permission);
};

module.exports = mongoose.model('User', userSchema);
