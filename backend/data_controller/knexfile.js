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
