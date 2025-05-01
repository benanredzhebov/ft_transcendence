import knex from 'knex';
import type { Knex } from 'knex'; //this is safe in TS/ESM

const DB = knex({
  client: 'sqlite3',
  connection: {
    filename: './data_controller/data/myData.db'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './data/migrations'
  }
});

export default DB;
