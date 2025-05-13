/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      table.binary('avatar');
      // If you wanted to store a file path instead:
      // table.string('avatar_path');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      table.dropColumn('avatar');
      // table.dropColumn('avatar_path');
    });
  };