import mongoose from 'mongoose';
import connectDB from './db.js';
import Event from './models/Event.js';

// Dummy events data
const dummyEvents = [
  {
    title: 'Global Climate Summit 2026',
    description: 'World leaders assemble in Paris to negotiate updated emissions targets and climate funding initiatives for developing countries.',
    category: 'Environment',
    country: 'France',
    continent: 'Europe',
    date: new Date('2026-11-15T09:00:00Z'),
    keywords: ['climate', 'summit', 'emissions', 'carbon', 'paris'],
    organizations: ['United Nations', 'IPCC'],
    source: 'Reuters',
    url: 'https://www.reuters.com/news/global-climate-summit-2026'
  },
  {
    title: 'Quantum Advantage Breakthrough announced by Joint Lab',
    description: 'Researchers from Berkeley and Tokyo announce a quantum processor capable of solving complex molecular simulations in seconds, surpassing classical computing limits.',
    category: 'Technology',
    country: 'United States',
    continent: 'North America',
    date: new Date('2026-06-22T14:30:00Z'),
    keywords: ['quantum', 'computing', 'berkeley', 'tokyo', 'breakthrough'],
    organizations: ['UC Berkeley', 'University of Tokyo'],
    source: 'Nature',
    url: 'https://www.nature.com/articles/quantum-advantage-2026'
  },
  {
    title: 'Global Economic Cooperation Treaty Signed',
    description: 'A landmark trade and economic treaty is signed between major Asian and European economies to reduce tariffs on green technologies.',
    category: 'Economy',
    country: 'Singapore',
    continent: 'Asia',
    date: new Date('2026-08-01T10:00:00Z'),
    keywords: ['trade', 'treaty', 'economy', 'tariffs', 'cooperation'],
    organizations: ['WTO', 'EU Commission'],
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/news/economic-treaty-signed-2026'
  },
  {
    title: 'International Health Congress Tackles Pandemic Preparedness',
    description: 'The World Health Organization hosts a conference on deploying AI models for early epidemic detection and response scaling.',
    category: 'Health',
    country: 'Switzerland',
    continent: 'Europe',
    date: new Date('2026-09-05T08:00:00Z'),
    keywords: ['health', 'pandemic', 'preparedness', 'detection', 'who'],
    organizations: ['World Health Organization', 'CDC'],
    source: 'WHO Bulletin',
    url: 'https://www.who.int/news/health-congress-2026'
  }
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Clearing existing events...');
    await Event.deleteMany({});
    console.log('Existing events cleared.');

    console.log('Inserting dummy events...');
    const insertedEvents = await Event.insertMany(dummyEvents);
    console.log(`Successfully inserted ${insertedEvents.length} events!`);

    console.log('\n--- Reading and Verifying Inserted Documents ---');
    const fetchedEvents = await Event.find({});
    fetchedEvents.forEach((event, index) => {
      console.log(`\nEvent #${index + 1}:`);
      console.log(`ID:          ${event._id}`);
      console.log(`Title:       ${event.title}`);
      console.log(`Category:    ${event.category}`);
      console.log(`Country:     ${event.country}`);
      console.log(`Keywords:    ${event.keywords.join(', ')}`);
      console.log(`Description: ${event.description}`);
    });
    console.log('\n------------------------------------------------');

    console.log('Seeding verification complete!');
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

seedDatabase();
