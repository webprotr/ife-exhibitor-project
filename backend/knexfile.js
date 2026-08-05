// backend/knexfile.js
const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'dev.sqlite3')
    },
    useNullAsDefault: true, // SQLite için zorunlu ayar
    migrations: {
      directory: path.join(__dirname, 'migrations')
    }
  }
};