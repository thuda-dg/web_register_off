const {
  sequelize
} = require('./models');

const {
  validateRegistration
} = require(
  './services/registration-validation.service'
);

async function testRegistrationValidation() {
  try {
    await sequelize.authenticate();

    const result =
      await validateRegistration({
        empId: 2,
        cycleId: 2,
        entries: [
          {
            leaveDate: '2026-08-03',
            leaveTypeCode: 'OFF'
          }
        ]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test validation failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testRegistrationValidation();