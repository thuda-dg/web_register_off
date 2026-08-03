const {
  validateEntryStructure
} = require(
  './services/common-registration-rule.service'
);

const result = validateEntryStructure({
  entries: [
    {
      leaveDate: '2026-02-30',
      leaveTypeCode: 'A'
    }
  ]
});

console.log(
  JSON.stringify(result, null, 2)
);