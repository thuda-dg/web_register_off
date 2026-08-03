const {
  sequelize
} = require('./models');

const {
  validateOffRequireHC
} = require(
  './services/off-rule.service'
);

async function testOffRequireHC() {
  try {
    await sequelize.authenticate();

    const result =
      await validateOffRequireHC({
        empId: 2,
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
      'Test RequireHC failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testOffRequireHC();