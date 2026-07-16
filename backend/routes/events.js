import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events with pagination, sorted by date desc
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Parse query params for pagination
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;

    // Boundary checks
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 500) limit = 500; // Hard cap to prevent abuse

    const skipIndex = (page - 1) * limit;

    // Get total count
    const totalCount = await Event.countDocuments({});

    // Fetch paginated events sorted by date descending
    const events = await Event.find({})
      .sort({ date: -1 })
      .skip(skipIndex)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      status: 'success',
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      events
    });
  } catch (error) {
    console.error(`Get events error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching events.'
    });
  }
});

// @route   GET /api/events/:id
// @desc    Get a single event by ID
// @access  Public
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId structure
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid Event ID format.'
    });
  }

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      event
    });
  } catch (error) {
    console.error(`Get event by ID error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while retrieving event.'
    });
  }
});

export default router;
