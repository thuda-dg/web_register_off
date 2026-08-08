const {
  sequelize
} = require('./models');

const {
  prepareRegistrationEntries
} = require(
  './services/registration-entry-preparation.service'
);

async function testPrepareRegistrationEntries() {
  try {
    await sequelize.authenticate();

    const result =
      await prepareRegistrationEntries({
        empId: 2,
        entries: [
          {
            leaveDate: '2026-08-03',
            leaveTypeCode: 'OFF'
          },
          {
            leaveDate: '2026-08-04',
            leaveTypeCode: 'A',
            reasonId: 4
          },
          {
            leaveDate: '2026-08-05',
            leaveTypeCode: 'A/2',
            reasonId: 5
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error({
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      leaveDate: error.leaveDate,
      leaveTypeCode: error.leaveTypeCode
    });
  } finally {
    await sequelize.close();
  }
}

testPrepareRegistrationEntries();