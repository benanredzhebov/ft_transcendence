// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
//-------init knex and the data  base
// npm install knex --save
// npm install sqlite3
// npx knex init

module.exports = {

  development: {
    client: 'sqlite3',
    connection: {
      filename: './data_controller/data/myData.db'
    },
    migrations: {
      directory : './data_controller/data/migrations'  //where you declere the tables, what data type and so on
    },
    // seeds :{  // test data to initialize the data base
    //   directory: "./data/seeds"
    // },
    useNullAsDefault : true,
  },

};
