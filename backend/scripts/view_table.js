
import DB from '../data_controller/dbConfig.js';

async function viewTable() {
  // Get the table name from the command-line arguments
  const tableName = process.argv[2];

  if (!tableName) {
    console.error('Error: Please provide a table name.');
    console.log('Usage: node scripts/view-table.js <tableName>');
    return;
  }

  console.log(`Fetching contents of the "${tableName}" table...`);
  try {
    const rows = await DB(tableName).select('*');

    if (rows.length === 0) {
      console.log(`The table "${tableName}" is empty.`);
    } else {
      // console.table() provides a nice, readable output for arrays of objects
      console.table(rows);
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    console.error('Please ensure the table name is correct.');
  } finally {
    // Close the database connection
    await DB.destroy();
  }
}

viewTable();