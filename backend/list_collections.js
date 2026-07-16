const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://REDACTED@cluster0.gogzxe7.mongodb.net/global_event_finder?appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('global_event_finder');
    const cols = await db.listCollections().toArray();
    console.log(cols.map(c => c.name));
  } finally {
    await client.close();
  }
}
run();
