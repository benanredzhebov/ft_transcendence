/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.table('credentialsTable', function(table) {
    table.string('two_factor_secret');
    table.boolean('two_factor_enabled').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.table('credentialsTable', function(table) {
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_enabled');
  });
};