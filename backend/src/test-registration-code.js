const {
  generateRegistrationCode
} = require(
  './services/registration-submit.service'
);

const result =
  generateRegistrationCode({
    empId: 2,
    cycleId: 2
  });

console.log(result);