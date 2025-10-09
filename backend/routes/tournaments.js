const express = require('express');
const Tournament = require('../models/Tournament');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all tournaments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { game, status, page = 1, limit = 10 } = req.query;
    
    const filter = { isPublic: true };
    if (game) filter.game = game;
    if (status) filter.status = status;

    const tournaments = await Tournament.find(filter)
      .populate('organizer', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tournament.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tournaments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tournaments',
      error: error.message
    });
  }
});

// Create tournament
router.post('/', authenticateToken, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const tournamentData = {
      ...req.body,
      organizer: req.user._id
    };

    const tournament = new Tournament(tournamentData);
    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: { tournament }
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tournament',
      error: error.message
    });
  }
});

module.exports = router;
