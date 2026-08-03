const {
  sequelize
} = require('./models');

const {
  validateAnnualLeaveReasons
} = require(
  './services/annual-leave-rule.service'
);

async function testAnnualLeaveReasonRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateAnnualLeaveReasons({
        entries: [
          {
            leaveDate: '2026-08-04',
            leaveTypeCode: 'A'
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test annual leave reason rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testAnnualLeaveReasonRule();