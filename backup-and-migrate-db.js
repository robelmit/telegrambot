const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Database URLs
const OLD_DB_URI = 'mongodb://46c38130e30acb1ec51f50e7c3fb50b1:12345678@17a.mongo.evennode.com:27031,17b.mongo.evennode.com:27031/46c38130e30acb1ec51f50e7c3fb50b1?replicaSet=eu-17';
const NEW_DB_URI = 'mongodb+srv://Mongodbadmin:coSNIiibrZcR8Tkr@cluster0.60udjwh.mongodb.net/faydabot?retryWrites=true&w=majority&appName=Cluster0';

const BACKUP_DIR = './database-backup';

async function backupDatabase() {
  console.log('📦 Starting database backup...\n');
  
  const client = new MongoClient(OLD_DB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to old database');
    
    const db = client.db();
    
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to backup:\n`);
    
    const backup = {};
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`  → Backing up collection: ${collName}`);
      
      const collection = db.collection(collName);
      const documents = await collection.find({}).toArray();
      
      backup[collName] = documents;
      console.log(`    ✓ ${documents.length} documents backed up`);
    }
    
    // Save backup to file
    const backupFile = path.join(BACKUP_DIR, `backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup completed: ${backupFile}\n`);
    
    return backup;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function restoreToNewDatabase(backup) {
  console.log('📤 Starting database restore to new MongoDB...\n');
  
  const client = new MongoClient(NEW_DB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to new database');
    
    const db = client.db();
    
    // Get collection names
    const collectionNames = Object.keys(backup);
    console.log(`\n📋 Restoring ${collectionNames.length} collections:\n`);
    
    for (const collName of collectionNames) {
      const documents = backup[collName];
      
      if (documents.length === 0) {
        console.log(`  → Skipping empty collection: ${collName}`);
        continue;
      }
      
      console.log(`  → Restoring collection: ${collName}`);
      
      const collection = db.collection(collName);
      
      // Drop existing collection if it exists
      try {
        await collection.drop();
        console.log(`    ✓ Dropped existing collection`);
      } catch (e) {
        // Collection doesn't exist, that's fine
      }
      
      // Insert documents
      await collection.insertMany(documents);
      console.log(`    ✓ ${documents.length} documents restored`);
    }
    
    console.log('\n✅ Restore completed successfully!\n');
    
    // Verify data
    console.log('🔍 Verifying restored data:\n');
    for (const collName of collectionNames) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();
      console.log(`  → ${collName}: ${count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function main() {
  try {
    console.log('🚀 Database Migration Tool\n');
    console.log('Old DB: EvenNode MongoDB');
    console.log('New DB: MongoDB Atlas\n');
    console.log('='.repeat(50) + '\n');
    
    // Step 1: Backup
    const backup = await backupDatabase();
    
    console.log('='.repeat(50) + '\n');
    
    // Step 2: Restore
    await restoreToNewDatabase(backup);
    
    console.log('='.repeat(50) + '\n');
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update .env file with new MONGODB_URI');
    console.log('  2. Restart your application');
    console.log('  3. Test the application with new database\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
