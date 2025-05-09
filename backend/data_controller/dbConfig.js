// const knex = require("knex");

// const config = require('./knexfile');

// const DB = knex(config.development);
// // npx knex migrate:make tests  //creates the data folder migration
// module.exports = DB;

import knex from 'knex';
import config from './knexfile.js';

const DB = knex(config.development);
export default DB;
