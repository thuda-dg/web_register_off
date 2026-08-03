const {
  validateDuplicateDatesInRequest
} = require(
  './services/common-registration-rule.service'
);

const result =
  validateDuplicateDatesInRequest({
    entries: [
      {
        leaveDate: '2026-08-04',
        leaveTypeCode: 'A'
      },
      {
        leaveDate: '2026-08-04',
        leaveTypeCode: 'A/2'
      }
    ]
  });
console.log(
  JSON.stringify(result, null, 2)
);