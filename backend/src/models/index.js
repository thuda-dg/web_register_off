const sequelize = require('../config/sequelize');

const Employee =
  require('./employee.model')(sequelize);

const Team =
  require('./team.model')(sequelize);

const Task =
  require('./task.model')(sequelize);

const EmpTeamHistory =
  require('./emp-team-history.model')(sequelize);

const EmpTaskHistory =
  require('./emp-task-history.model')(sequelize);

const LeaveType =
  require('./leave-type.model')(sequelize);

const LeaveReason =
  require('./leave-reason.model')(sequelize);

const RegistrationCycle =
  require('./registration-cycle.model')(sequelize);

const EmpAnnualLeave =
  require('./emp-annual-leave.model')(sequelize);

const EmployeeCycleOff =
  require('./employee-cycle-off.model')(sequelize);

const RequireHC =
  require('./require-hc.model')(sequelize);

const RegistrationSubmission =
  require('./registration-submission.model')(sequelize);

const RegistrationEntry =
  require('./registration-entry.model')(sequelize);

const RegistrationAction =
  require('./registration-action.model')(sequelize);

// Employee – team history
Employee.hasMany(EmpTeamHistory, {
  foreignKey: 'emp_id',
  as: 'teamHistories'
});

EmpTeamHistory.belongsTo(Employee, {
  foreignKey: 'emp_id',
  as: 'employee'
});

Team.hasMany(EmpTeamHistory, {
  foreignKey: 'team_id',
  as: 'employeeHistories'
});

EmpTeamHistory.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team'
});

// Employee – task history
Employee.hasMany(EmpTaskHistory, {
  foreignKey: 'emp_id',
  as: 'taskHistories'
});

EmpTaskHistory.belongsTo(Employee, {
  foreignKey: 'emp_id',
  as: 'employee'
});

Task.hasMany(EmpTaskHistory, {
  foreignKey: 'task_id',
  as: 'employeeHistories'
});

EmpTaskHistory.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task'
});

// Annual leave
Employee.hasMany(EmpAnnualLeave, {
  foreignKey: 'emp_id',
  as: 'annualLeaveBalances'
});

EmpAnnualLeave.belongsTo(Employee, {
  foreignKey: 'emp_id',
  as: 'employee'
});

// OFF by cycle
Employee.hasMany(EmployeeCycleOff, {
  foreignKey: 'emp_id',
  as: 'cycleOffBalances'
});

EmployeeCycleOff.belongsTo(Employee, {
  foreignKey: 'emp_id',
  as: 'employee'
});

RegistrationCycle.hasMany(EmployeeCycleOff, {
  foreignKey: 'cycle_id',
  as: 'employeeOffBalances'
});

EmployeeCycleOff.belongsTo(RegistrationCycle, {
  foreignKey: 'cycle_id',
  as: 'cycle'
});

// RequireHC
RegistrationCycle.hasMany(RequireHC, {
  foreignKey: 'cycle_id',
  as: 'requireHC'
});

RequireHC.belongsTo(RegistrationCycle, {
  foreignKey: 'cycle_id',
  as: 'cycle'
});

Task.hasMany(RequireHC, {
  foreignKey: 'task_id',
  as: 'requireHC'
});

RequireHC.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task'
});

// Submission
Employee.hasMany(RegistrationSubmission, {
  foreignKey: 'emp_id',
  as: 'submissions'
});

RegistrationSubmission.belongsTo(Employee, {
  foreignKey: 'emp_id',
  as: 'employee'
});

RegistrationCycle.hasMany(RegistrationSubmission, {
  foreignKey: 'cycle_id',
  as: 'submissions'
});

RegistrationSubmission.belongsTo(RegistrationCycle, {
  foreignKey: 'cycle_id',
  as: 'cycle'
});

// Submission – entries
RegistrationSubmission.hasMany(RegistrationEntry, {
  foreignKey: 'submission_id',
  as: 'entries'
});

RegistrationEntry.belongsTo(RegistrationSubmission, {
  foreignKey: 'submission_id',
  as: 'submission'
});

// Leave type and reason
LeaveType.hasMany(RegistrationEntry, {
  foreignKey: 'leave_type_id',
  as: 'entries'
});

RegistrationEntry.belongsTo(LeaveType, {
  foreignKey: 'leave_type_id',
  as: 'leaveType'
});

LeaveReason.hasMany(RegistrationEntry, {
  foreignKey: 'reason_id',
  as: 'entries'
});

RegistrationEntry.belongsTo(LeaveReason, {
  foreignKey: 'reason_id',
  as: 'reason'
});

// Snapshot team/task
Team.hasMany(RegistrationEntry, {
  foreignKey: 'team_id',
  as: 'registrationEntries'
});

RegistrationEntry.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team'
});

Task.hasMany(RegistrationEntry, {
  foreignKey: 'task_id',
  as: 'registrationEntries'
});

RegistrationEntry.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task'
});

// Entry actions
RegistrationEntry.hasMany(RegistrationAction, {
  foreignKey: 'entry_id',
  as: 'actions'
});

RegistrationAction.belongsTo(RegistrationEntry, {
  foreignKey: 'entry_id',
  as: 'entry'
});

module.exports = {
  sequelize,
  Employee,
  Team,
  Task,
  EmpTeamHistory,
  EmpTaskHistory,
  LeaveType,
  LeaveReason,
  RegistrationCycle,
  EmpAnnualLeave,
  EmployeeCycleOff,
  RequireHC,
  RegistrationSubmission,
  RegistrationEntry,
  RegistrationAction
};