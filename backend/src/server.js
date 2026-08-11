const app = require('./app');
const sequelize = require('./config/sequelize');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    app.locals.dbReady = true;

    console.log('PostgreSQL connected through Sequelize');
  } catch (error) {
    app.locals.dbReady = false;
    console.error(
      'Cannot connect to PostgreSQL through Sequelize:',
      error
    );
  }

  app.listen(port, () => {
    console.log(
      `Backend is running at http://localhost:${port}`
    );
  });
}

startServer();