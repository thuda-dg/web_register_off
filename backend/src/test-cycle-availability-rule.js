const {
  sequelize
} = require('./models');

const {
  validateCycleAvailability
} = require(
  './services/common-registration-rule.service'
);

async function testCycleAvailability() {
  try {
    await sequelize.authenticate();

    const result =
      await validateCycleAvailability({
        cycleId: 2
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test cycle availability failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testCycleAvailability();