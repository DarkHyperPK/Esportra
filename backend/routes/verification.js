const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const VerificationRequest = require('../models/VerificationRequest');
const User = require('../models/User');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload file to Cloudinary
const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `fragandbook/${folder}`,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    
    uploadStream.end(file.buffer);
  });
};

// Submit verification request
router.post('/submit', authenticateToken, upload.fields([
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      requestedRole,
      businessName,
      businessType,
      businessDescription,
      experienceDescription,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      website,
      socialMediaLinks
    } = req.body;

    // Validation
    if (!requestedRole || !businessName || !businessType || !businessDescription || 
        !experienceDescription || !firstName || !lastName || !email || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    if (!req.files?.cnicFront || !req.files?.cnicBack) {
      return res.status(400).json({
        success: false,
        message: 'CNIC front and back images are required'
      });
    }

    // Check if user already has a pending request
    const existingRequest = await VerificationRequest.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification request'
      });
    }

    // Upload CNIC images to Cloudinary
    const cnicFrontUrl = await uploadToCloudinary(req.files.cnicFront[0], 'cnic');
    const cnicBackUrl = await uploadToCloudinary(req.files.cnicBack[0], 'cnic');

    // Parse social media links
    let socialLinks = {};
    if (socialMediaLinks) {
      try {
        socialLinks = JSON.parse(socialMediaLinks);
      } catch (e) {
        // If parsing fails, ignore social links
      }
    }

    // Create verification request
    const verificationRequest = new VerificationRequest({
      user: req.user._id,
      requestedRole,
      businessName,
      businessType,
      businessDescription,
      experienceDescription,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      website,
      socialMediaLinks: socialLinks,
      cnicFront: cnicFrontUrl,
      cnicBack: cnicBackUrl
    });

    await verificationRequest.save();

    res.status(201).json({
      success: true,
      message: 'Verification request submitted successfully',
      data: {
        requestId: verificationRequest._id,
        status: verificationRequest.status
      }
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit verification request',
      error: error.message
    });
  }
});

// Get user's verification requests
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id })
      .sort({ submittedAt: -1 })
      .populate('reviewedBy', 'username fullName');

    res.json({
      success: true,
      data: {
        requests: requests.map(req => req.getSummary())
      }
    });
  } catch (error) {
    console.error('Get verification requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification requests',
      error: error.message
    });
  }
});

// Get verification request details
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.requestId)
      .populate('user', 'username fullName email')
      .populate('reviewedBy', 'username fullName');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    // Check if user can view this request
    if (request.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        request
      }
    });
  } catch (error) {
    console.error('Get verification request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification request',
      error: error.message
    });
  }
});

// Admin: Get all verification requests
router.get('/admin/all', authenticateToken, requirePermission('verification:view'), async (req, res) => {
  try {
    const { status, requestedRole, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (requestedRole) filter.requestedRole = requestedRole;

    const requests = await VerificationRequest.find(filter)
      .populate('user', 'username fullName email')
      .populate('reviewedBy', 'username fullName')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await VerificationRequest.countDocuments(filter);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all verification requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification requests',
      error: error.message
    });
  }
});

// Admin: Approve verification request
router.put('/:requestId/approve', authenticateToken, requirePermission('verification:approve'), async (req, res) => {
  try {
    const { notes } = req.body;
    
    const request = await VerificationRequest.findById(req.params.requestId)
      .populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    if (!request.canReview()) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be approved in current status'
      });
    }

    // Approve the request
    request.approve(req.user._id, notes);
    await request.save();

    // Update user role and verification status
    const user = request.user;
    user.role = request.requestedRole;
    user.isVerified = true;
    user.verificationStatus = 'verified';
    await user.save();

    res.json({
      success: true,
      message: 'Verification request approved successfully',
      data: {
        request: request.getSummary()
      }
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve verification request',
      error: error.message
    });
  }
});

// Admin: Reject verification request
router.put('/:requestId/reject', authenticateToken, requirePermission('verification:reject'), async (req, res) => {
  try {
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const request = await VerificationRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    if (!request.canReview()) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be rejected in current status'
      });
    }

    // Reject the request
    request.reject(req.user._id, reason, notes);
    await request.save();

    res.json({
      success: true,
      message: 'Verification request rejected successfully',
      data: {
        request: request.getSummary()
      }
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject verification request',
      error: error.message
    });
  }
});

// Admin: Add comment to verification request
router.post('/:requestId/comment', authenticateToken, requirePermission('verification:view'), async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    const request = await VerificationRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }

    request.addComment(req.user._id, comment);
    await request.save();

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        request: request.getSummary()
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

module.exports = router;
