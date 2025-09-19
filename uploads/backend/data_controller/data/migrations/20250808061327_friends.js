
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('friendships', table => {
    table.increments('id').primary();
    table.integer('user1_id').unsigned().references('id').inTable('credentialsTable').onDelete('CASCADE');
    table.integer('user2_id').unsigned().references('id').inTable('credentialsTable').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('pending');
    table.integer('action_user_id').unsigned().references('id').inTable('credentialsTable');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('friendships');
};
