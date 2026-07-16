import express from 'express';
import SavedEvent from '../models/SavedEvent.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get saved events for the current user
router.get('/', auth, async (req, res) => {
  try {
    const savedEvents = await SavedEvent.find({ userId: req.user.id })
      .populate('eventId')
      .sort({ savedAt: -1 });
    
    // Extract just the event objects to match the shape the frontend expects
    const events = savedEvents.map(se => se.eventId);
    
    res.json({ status: 'success', events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch saved events' });
  }
});

// Save an event
router.post('/', auth, async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ status: 'error', message: 'eventId is required' });
    }

    const existing = await SavedEvent.findOne({ userId: req.user.id, eventId });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Event already saved' });
    }

    const savedEvent = new SavedEvent({
      userId: req.user.id,
      eventId
    });
    
    await savedEvent.save();
    res.status(201).json({ status: 'success', message: 'Event saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to save event' });
  }
});

// Remove a saved event
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const result = await SavedEvent.findOneAndDelete({ userId: req.user.id, eventId });
    if (!result) {
      return res.status(404).json({ status: 'error', message: 'Saved event not found' });
    }
    
    res.json({ status: 'success', message: 'Event unsaved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to unsave event' });
  }
});

export default router;
