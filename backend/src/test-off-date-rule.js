const {
  sequelize
} = require('./models');

const {
  validateOffDatesInCycle
} = require(
  './services/off-rule.service'
);

async function testOffDateRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateOffDatesInCycle({
        cycleId: 2,
        entries: [
          {
            leaveDate: '2026-08-03',
            leaveTypeCode: 'OFF'
          }
        ]
      });

    console.log(result);
  } catch (error) {
    console.error(
      'Test OFF date rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testOffDateRule();