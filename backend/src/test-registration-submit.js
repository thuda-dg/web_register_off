const {
  sequelize
} = require('./models');

const {
  submitRegistration
} = require(
  './services/registration-submit.service'
);

async function testRegistrationSubmit() {
  try {
    await sequelize.authenticate();

    const result =
      await submitRegistration({
        empId: 2,
        cycleId: 2,
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
    console.error(
      JSON.stringify(
        {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          validationErrors:
            error.validationErrors || null,
          databaseError:
            error.parent?.message || null
        },
        null,
        2
      )
    );
  } finally {
    await sequelize.close();
  }
}

testRegistrationSubmit();