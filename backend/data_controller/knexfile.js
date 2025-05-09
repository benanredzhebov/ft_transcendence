// knexfile.js

// Use ESM syntax instead of CommonJS
const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './data_controller/data/myData.db',
    },
    migrations: {
      directory: './data/migrations', // where you declare the tables
    },
    // seeds: {
    //   directory: './data/seeds',
    // },
    useNullAsDefault: true,
  },
};

export default config;