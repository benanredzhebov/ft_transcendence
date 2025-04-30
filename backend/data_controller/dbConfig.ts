import knex from 'knex';
import { Knex } from 'knex';

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './data_controller/data/myData.db'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './data/migrations'
  }
});

export default db;
