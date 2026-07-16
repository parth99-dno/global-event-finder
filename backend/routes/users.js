import express from 'express';
import User from '../models/User.js';
import SearchHistory from '../models/SearchHistory.js';
import SavedEvent from '../models/SavedEvent.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    const savedCount = await SavedEvent.countDocuments({ userId: req.user.id });
    
    res.json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests,
        savedCount
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile' });
  }
});

// Update current user profile (e.g. interests)
router.patch('/me', auth, async (req, res) => {
  try {
    const { interests } = req.body;
    
    if (!Array.isArray(interests)) {
      return res.status(400).json({ status: 'error', message: 'interests must be an array' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests },
      { new: true }
    ).select('-password');
    
    res.json({ status: 'success', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to update profile' });
  }
});

// Get current user search history
router.get('/history', auth, async (req, res) => {
  try {
    const history = await SearchHistory.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(20);
      
    res.json({ status: 'success', history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch search history' });
  }
});

export default router;
