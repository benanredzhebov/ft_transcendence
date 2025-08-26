/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      table.string('avatar_path');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      table.dropColumn('avatar_path');
    });
  };