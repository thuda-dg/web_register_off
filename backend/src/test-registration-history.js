const {
  sequelize
} = require('./models');

const {
  getMyRegistrationEntries
} = require(
  './services/registration-history.service'
);

async function testRegistrationHistory() {
  try {
    await sequelize.authenticate();

    const result =
      await getMyRegistrationEntries({
        empId: 2,
        cycleId: 2
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error({
      message: error.message,
      databaseError:
        error.parent?.message || null
    });
  } finally {
    await sequelize.close();
  }
}

testRegistrationHistory();