const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;

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
