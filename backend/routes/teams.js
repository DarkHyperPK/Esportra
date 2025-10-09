const express = require('express');
const Team = require('../models/Team');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all teams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { game, page = 1, limit = 10 } = req.query;
    
    const filter = { isActive: true };
    if (game) filter.game = game;

    const teams = await Team.find(filter)
      .populate('owner', 'username fullName avatar')
      .populate('members.user', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Team.countDocuments(filter);

    res.json({
      success: true,
      data: {
        teams,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get teams',
      error: error.message
    });
  }
});

// Create team
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, tag, description, game, gameFormat, maxMembers } = req.body;

    if (!name || !tag || !game) {
      return res.status(400).json({
        success: false,
        message: 'Name, tag, and game are required'
      });
    }

    const team = new Team({
      name,
      tag,
      description,
      game,
      gameFormat,
      maxMembers,
      owner: req.user._id
    });

    // Add owner as first member
    team.addMember(req.user._id, 'owner');
    
    await team.save();

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
});

module.exports = router;
