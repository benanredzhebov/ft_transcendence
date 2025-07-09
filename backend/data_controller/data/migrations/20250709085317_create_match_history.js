/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('matchHistory', table => {
    table.increments('id').primary();
    table.integer('player1_id').unsigned().references('id').inTable('credentialsTable').onDelete('SET NULL');
    table.integer('player2_id').unsigned().references('id').inTable('credentialsTable').onDelete('SET NULL');
    table.string('player1_username').notNullable();
    table.string('player2_username').notNullable();
    table.integer('player1_score').notNullable();
    table.integer('player2_score').notNullable();
    table.integer('winner_id').unsigned().references('id').inTable('credentialsTable').onDelete('SET NULL');
    table.string('winner_username').notNullable();
    table.timestamp('match_date').defaultTo(knex.fn.now());
    table.boolean('is_tournament').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('matchHistory');
};