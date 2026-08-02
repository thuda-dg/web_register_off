const app = require('./app');
const sequelize = require('./config/sequelize');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log('PostgreSQL connected through Sequelize');

    app.listen(port, () => {
      console.log(
        `Backend is running at http://localhost:${port}`
      );
    });
  } catch (error) {
    console.error(
      'Cannot connect to PostgreSQL through Sequelize:',
      error
    );

    process.exit(1);
  }
}

startServer();