const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Request Type
  requestedRole: {
    type: String,
    enum: ['organizer', 'venue_owner'],
    required: true
  },
  
  // Business Information
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  businessType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  businessDescription: {
    type: String,
    required: true,
    maxlength: 1000
  },
  experienceDescription: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  
  // Contact Information
  website: {
    type: String,
    trim: true,
    maxlength: 200
  },
  socialMediaLinks: {
    discord: String,
    twitter: String,
    twitch: String,
    youtube: String,
    instagram: String,
    facebook: String
  },
  
  // Document Uploads
  cnicFront: {
    type: String, // Cloudinary URL
    required: true
  },
  cnicBack: {
    type: String, // Cloudinary URL
    required: true
  },
  additionalDocuments: [{
    name: String,
    url: String,
    type: String
  }],
  
  // Status & Review
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  verificationNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Admin Comments
  adminComments: [{
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
verificationRequestSchema.index({ user: 1 });
verificationRequestSchema.index({ status: 1 });
verificationRequestSchema.index({ requestedRole: 1 });
verificationRequestSchema.index({ submittedAt: -1 });
verificationRequestSchema.index({ reviewedBy: 1 });

// Update lastUpdatedAt before saving
verificationRequestSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});

// Check if request can be updated
verificationRequestSchema.methods.canUpdate = function() {
  return this.status === 'pending' || this.status === 'under_review';
};

// Check if request can be reviewed
verificationRequestSchema.methods.canReview = function() {
  return this.status === 'pending' || this.status === 'under_review';
};

// Approve request
verificationRequestSchema.methods.approve = function(adminId, notes = '') {
  if (!this.canReview()) {
    throw new Error('Request cannot be approved in current status');
  }
  
  this.status = 'approved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.verificationNotes = notes;
};

// Reject request
verificationRequestSchema.methods.reject = function(adminId, reason, notes = '') {
  if (!this.canReview()) {
    throw new Error('Request cannot be rejected in current status');
  }
  
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  this.verificationNotes = notes;
};

// Add admin comment
verificationRequestSchema.methods.addComment = function(adminId, comment) {
  this.adminComments.push({
    admin: adminId,
    comment,
    createdAt: new Date()
  });
};

// Get request summary
verificationRequestSchema.methods.getSummary = function() {
  return {
    id: this._id,
    user: this.user,
    requestedRole: this.requestedRole,
    businessName: this.businessName,
    status: this.status,
    submittedAt: this.submittedAt,
    reviewedAt: this.reviewedAt,
    reviewedBy: this.reviewedBy
  };
};

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
