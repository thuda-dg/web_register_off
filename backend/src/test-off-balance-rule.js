const {
  sequelize
} = require('./models');

const {
  validateOffBalance
} = require(
  './services/off-rule.service'
);

async function testOffBalanceRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateOffBalance({
        empId: 2,
        cycleId: 2,
        entries: [
          {
            leaveDate: '2026-08-03',
            leaveTypeCode: 'OFF'
          },
          {
            leaveDate: '2026-08-10',
            leaveTypeCode: 'OFF'
          }
        ]
      });

    console.log(result);
  } catch (error) {
    console.error(
      'Test OFF balance rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testOffBalanceRule();