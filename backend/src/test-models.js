const {
  sequelize,
  Employee,
  Team,
  Task,
  RegistrationCycle,
  EmpAnnualLeave,
  EmployeeCycleOff,
  RequireHC,
  LeaveReason
} = require('./models');

async function testModels() {
  try {
    await sequelize.authenticate();

    const employeeCount =
      await Employee.count();

    const teamCount =
      await Team.count();

    const taskCount =
      await Task.count();

    const cycleCount =
      await RegistrationCycle.count();

    const annualLeaveCount =
      await EmpAnnualLeave.count();

    const offBalanceCount =
      await EmployeeCycleOff.count();

    const requireHCCount =
      await RequireHC.count();

    const reasonCount =
      await LeaveReason.count();

    console.log({
      employeeCount,
      teamCount,
      taskCount,
      cycleCount,
      annualLeaveCount,
      offBalanceCount,
      requireHCCount,
      reasonCount
    });
  } catch (error) {
    console.error(
      'Model test failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testModels();