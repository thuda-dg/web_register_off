const {
  sequelize
} = require('./models');

const {
  getAnnualLeaveBalance
} = require(
  './services/leave-balance.service'
);

async function testAnnualLeave() {
  try {
    await sequelize.authenticate();

    const result =
      await getAnnualLeaveBalance({
        empId: 2,
        balanceYear: 2026
      });

    console.log(result);
  } catch (error) {
    console.error(
      'Test annual leave failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testAnnualLeave();