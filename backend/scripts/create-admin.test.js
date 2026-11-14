const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough, Writable } = require('node:stream');
const { spawnSync } = require('node:child_process');
const { readPassword } = require('./create-admin');

function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => {};
  let printed = '';
  const output = new Writable({ write(chunk, _encoding, done) { printed += chunk.toString(); done(); } });
  output.isTTY = true;
  return { input, output, printed: () => printed };
}

test('reads hidden password with backspace and never echoes its contents', async () => {
  const tty = terminal();
  const pending = readPassword('Password: ', tty);
  for (const key of ['exampleX', '\u007f', '1', '\r']) tty.input.write(key);
  assert.equal(await pending, 'example1');
  assert.equal(tty.printed(), 'Password: \n');
  tty.input.destroy();
});

test('Ctrl+C cancels hidden prompt', async () => {
  const tty = terminal();
  const pending = readPassword('Password: ', tty);
  tty.input.write('\u0003');
  await assert.rejects(pending, /Đã hủy/);
  tty.input.destroy();
});

test('rejects noninteractive password input', async () => {
  await assert.rejects(readPassword('', { input: { isTTY: false }, output: {} }), /terminal/);
});

test('help and invalid arguments exit before loading DB or prompting for passwords', () => {
  const script = require.resolve('./create-admin');
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /create:admin/);
  const invalid = spawnSync(process.execPath, [script, '--email', 'bad-email'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /--code/);
});
