const {
  sequelize
} = require('./models');

const {
  getEmployeeAssignmentByDate
} = require(
  './services/employee-assignment.service'
);

async function testEmployeeAssignment() {
  try {
    await sequelize.authenticate();

    const result =
      await getEmployeeAssignmentByDate({
        empId: 2,
        workingDate: '2026-08-04'
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error({
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      leaveDate: error.leaveDate
    });
  } finally {
    await sequelize.close();
  }
}

testEmployeeAssignment();