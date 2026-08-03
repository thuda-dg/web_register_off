const {
  sequelize
} = require('./models');

const {
  validateAnnualLeaveDatesInCycle
} = require(
  './services/annual-leave-rule.service'
);

async function testAnnualLeaveDateRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateAnnualLeaveDatesInCycle({
        cycleId: 2,
        entries: [
          {
            leaveDate: '2026-09-01',
            leaveTypeCode: 'A'
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test annual leave date rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testAnnualLeaveDateRule();