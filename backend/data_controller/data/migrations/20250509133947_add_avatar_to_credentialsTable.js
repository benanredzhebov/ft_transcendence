/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      // table.dropColumn('avatar'); // If changing from existing binary, uncomment if needed
      table.string('avatar_path'); // Store the path as a string
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = async (knex) => {
    await knex.schema.alterTable('credentialsTable', (table) => {
      table.dropColumn('avatar_path');
      // table.binary('avatar'); // If reverting
    });
  };