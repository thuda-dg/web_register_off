const {
  sequelize
} = require('./models');

const {
  validateAnnualLeaveTypes
} = require(
  './services/annual-leave-rule.service'
);

async function testAnnualLeaveTypes() {
  try {
    await sequelize.authenticate();

    const result =
      await validateAnnualLeaveTypes({
        entries: [
  {
    leaveDate: '2026-08-04',
    leaveTypeCode: 'A'
  },
  {
    leaveDate: '2026-08-05',
    leaveTypeCode: 'A/2'
  }
]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test annual leave type rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testAnnualLeaveTypes();