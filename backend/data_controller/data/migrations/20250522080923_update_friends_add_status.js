/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('friends', table => {
    table.string('status').defaultTo('pending'); // pending | accepted | rejected
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function(knex) {
  await knex.schema.alterTable('friends', table => {
    table.dropColumn('status');
  });
};

