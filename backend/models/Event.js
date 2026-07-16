import mongoose from 'mongoose';

const categories = [
  'Politics',
  'Economy',
  'Technology',
  'Sports',
  'Environment',
  'Health',
  'Science',
  'Diplomacy'
];

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: categories
  },
  country: {
    type: String,
    trim: true
  },
  continent: {
    type: String,
    trim: true
  },
  date: {
    type: Date
  },
  keywords: {
    type: [String],
    default: []
  },
  organizations: {
    type: [String],
    default: []
  },
  source: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create text index on title, description, and keywords
eventSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text'
});

const Event = mongoose.model('Event', eventSchema);
export default Event;
export { categories };
