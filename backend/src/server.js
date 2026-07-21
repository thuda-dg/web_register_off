const app = require('./app');
const pool = require('./config/database');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await pool.query('SELECT NOW()');

    console.log('PostgreSQL connected');

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Cannot connect to PostgreSQL:', error);
    process.exit(1);
  }
}

startServer();