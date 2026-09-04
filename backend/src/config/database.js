const path = require('path');
const {Pool} = require('pg');

require('dotenv').config({
  path: path.resolve(
    __dirname,
    '../../.env'
  )
});

const pool =
  new Pool({host:process.env.DB_HOST,
        port:Number(process.env.DB_PORT || 5433),
        database:process.env.DB_NAME,
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD
  });

pool.on('error',
  error => {
    console.error('PostgreSQL pool error:',error);
  }
);
module.exports = pool;