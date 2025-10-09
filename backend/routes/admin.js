const express = require('express');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const Team = require('../models/Team');
    const Tournament = require('../models/Tournament');
    const VerificationRequest = require('../models/VerificationRequest');

    const [
      totalUsers,
      totalTeams,
      totalTournaments,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments(),
      Team.countDocuments(),
      Tournament.countDocuments(),
      VerificationRequest.countDocuments({ status: 'pending' })
    ]);

    // Calculate additional stats
    const activeTournaments = await Tournament.countDocuments({ 
      status: { $in: ['upcoming', 'ongoing'] } 
    });
    
    const activeVenues = await User.countDocuments({ 
      role: 'venue_owner',
      isVerified: true 
    });
    
    const totalRevenue = await Tournament.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$prizePool' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeVenues,
        activeTournaments,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingVerifications
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin stats',
      error: error.message
    });
  }
});

module.exports = router;
