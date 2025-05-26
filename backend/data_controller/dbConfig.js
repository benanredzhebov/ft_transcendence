const knex = require("knex");

const config = require('../knexfile');

const DB = knex(config.development);
// npx knex migrate:make tests  //creates the data folder migration
module.exports = DB;