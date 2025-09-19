import DB from '../data_controller/dbConfig.js';

async function emptyTable() {
  console.log('Attempting to clear the friendships table...');
  try {
    const count = await DB('friendships').del();
    console.log(`Success! Deleted ${count} rows from the friendships table.`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // It's important to destroy the connection pool, otherwise the script will hang
    await DB.destroy();
  }
}

emptyTable();