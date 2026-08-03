const {
  sequelize
} = require('./models');

const {
  validateAnnualLeaveBalance
} = require(
  './services/annual-leave-rule.service'
);

async function testAnnualLeaveBalanceRule() {
  try {
    await sequelize.authenticate();

    const result =
      await validateAnnualLeaveBalance({
        empId: 2,
        balanceYear: 2026,
        entries: [
  { leaveDate: '2026-07-27', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-07-28', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-07-29', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-07-30', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-07-31', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-01', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-02', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-03', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-04', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-05', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-06', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-07', leaveTypeCode: 'A', reasonId: 4 },
  { leaveDate: '2026-08-08', leaveTypeCode: 'A', reasonId: 4 }
]
      });

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error(
      'Test annual leave balance rule failed:',
      error
    );
  } finally {
    await sequelize.close();
  }
}

testAnnualLeaveBalanceRule();