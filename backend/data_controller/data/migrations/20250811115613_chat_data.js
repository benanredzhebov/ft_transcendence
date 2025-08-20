/**
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('chat_messages', (table) => {
    table.increments('id').primary();
    table.integer('sender_id').unsigned().notNullable().references('id').inTable('credentialsTable').onDelete('CASCADE'); // If a user is deleted, their messages are also deleted.
    table.integer('recipient_id').unsigned().notNullable().references('id').inTable('credentialsTable').onDelete('CASCADE');
    table.text('message_text').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex)  {
  await knex.schema.dropTableIfExists('chat_messages');
}
