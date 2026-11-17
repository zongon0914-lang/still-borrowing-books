// tools/ 底下的指令程式（check-online、build-data…）大多沒有被其他測試載入，
// 寫壞了要等到真的執行才會發現。這裡至少確認每一支的語法都正確（node --check，不會真的執行）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../tools/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));

test('tools/ 底下每一支 .mjs 的語法都正確', () => {
  assert.ok(files.includes('check-online.mjs'), '找不到 tools/check-online.mjs');
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', `${dir}${file}`], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${file} 有語法錯誤：\n${result.stderr}`);
  }
});
