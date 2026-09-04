require('dotenv').config();

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5433),
  dialect: 'postgres',
  logging: false,
  timezone: '+07:00',

  // Lưu trạng thái migration đã chạy
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',

  // Lưu trạng thái seeder đã chạy
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',

  dialectOptions: {
    useUTC: false,
  },
};

module.exports = {
  development: common,

  test: {
    ...common,
    database:
      process.env.DB_TEST_NAME ||
      `${process.env.DB_NAME}_test`,
  },

  production: {
    ...common,
    logging: false,
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : common.dialectOptions,
  },
};