/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
	return knex.schema.alterTable('credentialsTable', (table) => {
	  table.string('two_factor_secret').nullable(); // Add the 2FA secret column
	});
  }
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  export function down(knex) {
	return knex.schema.alterTable('credentialsTable', (table) => {
	  table.dropColumn('two_factor_secret'); // Remove the 2FA secret column
	});
  }