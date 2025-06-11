// knexfile.js

// Use ESM syntax instead of CommonJS
// const config = {
//   development: {
//     client: 'sqlite3',
//     connection: {
//       filename: './data_controller/data/myData.db', //SQLite database file  
//     },
//     migrations: {
//       directory: './data/migrations', // where you declare the tables
//     },
//     // seeds: {
//     //   directory: './data/seeds',
//     // },
//     useNullAsDefault: true,
//   },
// };

// export default config;

// knexfile.js (ESM)
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, 'data/myData.db'),
    },
    migrations: {
      directory: path.resolve(__dirname, 'data/migrations'),
    },
    useNullAsDefault: true,
  },
};

export default config;
