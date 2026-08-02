const {
  sequelize
} = require('./models');

const {
  getOffBalance
} = require(
  './services/leave-balance.service'
);

async function testOffBalance() {
  try {
    await sequelize.authenticate();

    const result =
      await getOffBalance({
        empId: 2,
        cycleId: 2
      });

    console.log(result);
  } catch (error) {
    console.error(
      'Test off balance failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testOffBalance();