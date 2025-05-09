/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// where we declare the db schema
exports.up = async (knex) => {
	await knex.schema.createTable("credentialsTable", table =>{
		// ID
		table.increments(); // increments the id and gives the id
		// NAME
		// 256 length
		// notNullable so you can t add an empty string
		table.text("username",256).notNullable();
		table.text("email",256).notNullable();
		table.text("password",256).notNullable();

	})
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async knex =>{
	await knex.schema.dropTableIfExists('credentialsTable');
}

// npx knex migrate:latest
