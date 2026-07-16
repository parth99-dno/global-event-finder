import mongoose from 'mongoose';

const savedEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user cannot save the same event multiple times
savedEventSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const SavedEvent = mongoose.model('SavedEvent', savedEventSchema);
export default SavedEvent;
