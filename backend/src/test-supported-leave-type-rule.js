const {
  sequelize
} = require('./models');

const {
  validateSupportedLeaveTypes
} = require(
  './services/common-registration-rule.service'
);

async function testSupportedLeaveTypes() {
  try {
    await sequelize.authenticate();

    const result =
      await validateSupportedLeaveTypes({
        entries: [
          {
            leaveDate: '2026-08-03',
            leaveTypeCode: 'OFF'
          },
          {
            leaveDate: '2026-08-04',
            leaveTypeCode: 'A'
          },
          {
            leaveDate: '2026-08-05',
            leaveTypeCode: 'Abc'
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test supported leave type failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testSupportedLeaveTypes();