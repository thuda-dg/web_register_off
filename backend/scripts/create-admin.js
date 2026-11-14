const { parseArgs } = require('node:util');
const { StringDecoder } = require('node:string_decoder');

const HELP = `Tạo nhân viên mới kèm tài khoản ACTIVE có role ADMIN.

Chạy từ thư mục backend:
  npm run create:admin -- --code ADMIN001 --name "Quản trị viên" --email admin@example.com

Script hỏi mật khẩu và xác nhận, không hiển thị ký tự đã nhập.
Yêu cầu backend/.env, schema đã migrate và role ADMIN active từ master seed.
Mã nhân viên và email phải chưa tồn tại; script không đổi tài khoản có sẵn.
`;

function readPassword(label, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY) {
    return Promise.reject(new Error('Hãy chạy trong terminal tương tác để nhập mật khẩu ẩn.'));
  }
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    const decoder = new StringDecoder('utf8');
    const characters = [];
    function finish(error) {
      input.removeListener('data', onData);
      input.removeListener('end', onEnd);
      input.removeListener('error', finish);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\n');
      if (error) reject(error);
      else resolve(characters.join(''));
    }
    function onEnd() { finish(new Error('Đã hủy tạo ADMIN.')); }
    function onData(chunk) {
      for (const character of decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))) {
        if (character === '\r' || character === '\n') { finish(); return; }
        if (character === '\u0003' || character === '\u0004') { onEnd(); return; }
        if (character === '\u007f' || character === '\b') characters.pop();
        else if (character >= ' ') characters.push(character);
      }
    }
    output.write(label);
    input.setRawMode(true);
    input.on('data', onData);
    input.once('end', onEnd);
    input.once('error', finish);
    input.resume();
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      code: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: false
  });
  if (values.help) { console.log(HELP); return; }
  const employeeCode = values.code?.trim();
  const fullName = values.name?.trim();
  const email = values.email?.trim().toLowerCase();
  if (!employeeCode || employeeCode.length > 50 || !fullName || fullName.length > 150 ||
      !email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Cần --code (tối đa 50 ký tự), --name (tối đa 150 ký tự), --email hợp lệ. Dùng --help để xem ví dụ.');
  }
  const password = await readPassword('Mật khẩu (ít nhất 8 ký tự, tối đa 72 byte): ');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte UTF-8.');
  }
  if (password !== await readPassword('Nhập lại mật khẩu: ')) {
    throw new Error('Mật khẩu xác nhận không khớp.');
  }

  // Load app modules only after CLI validation; --help never needs env or DB.
  const { sequelize, Role } = require('../src/models');
  // Never log INSERT parameters (including password hashes) from this command.
  sequelize.options.logging = false;
  try {
    const { createUser } = require('../src/services/admin.service');
    await sequelize.authenticate();
    const role = await Role.findOne({ where: { role_code: 'ADMIN', is_active: true } });
    if (!role) {
      throw new Error('Chưa có role ADMIN active. Chạy master seed trước khi tạo ADMIN.');
    }
    const result = await createUser({
      employeeCode, fullName, email, password, teamId: null, roleIds: [Number(role.role_id)]
    });
    console.log(`Đã tạo ADMIN: ${result.item.employeeCode} — ${result.item.email}`);
    console.log('Có thể đăng nhập bằng mã nhân viên hoặc email và mật khẩu vừa nhập.');
  } catch (error) {
    // Sequelize errors may carry SQL/bind values. Print only controlled messages.
    if (error.statusCode || error.message === 'Chưa có role ADMIN active. Chạy master seed trước khi tạo ADMIN.') {
      throw new Error(error.message);
    }
    throw new Error('Không tạo được ADMIN. Kiểm tra cấu hình .env, kết nối DB và migrations.');
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { main, readPassword };
