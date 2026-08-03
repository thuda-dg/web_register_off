const {
  sequelize
} = require('./models');

const {
  validateWeeklyOff
} = require(
  './services/off-rule.service'
);

async function testWeeklyOff() {
  try {
    await sequelize.authenticate();

    const result =
      await validateWeeklyOff({
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
      'Test weekly OFF failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testWeeklyOff();