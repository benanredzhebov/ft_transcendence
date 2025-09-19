import knex from 'knex';
import config from './knexfile.js';

const DB = knex(config.development);
export default DB;
