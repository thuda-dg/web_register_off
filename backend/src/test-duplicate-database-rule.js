const {
  sequelize
} = require('./models');

const {
  validateDuplicateDatesInDatabase
} = require(
  './services/common-registration-rule.service'
);

async function testDuplicateDatabaseRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateDuplicateDatesInDatabase({
        empId: 2,
        cycleId: 2,
        entries: [
          {
            leaveDate: '2026-08-04',
            leaveTypeCode: 'A',
            reasonId: 4
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test duplicate database rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testDuplicateDatabaseRule();