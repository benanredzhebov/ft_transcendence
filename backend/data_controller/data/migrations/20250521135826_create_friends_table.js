/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('friends', table => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.integer('friend_id').notNullable();
    table.boolean('is_blocked').defaultTo(false);
	table.enum('status', ['pending', 'accepted', 'rejected']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'friend_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('friends');
};
