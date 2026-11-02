import fs from 'node:fs';
import path from 'node:path';

/**
 * JSON 文件存储：data/ 运行时数据（gitignore），首次启动从 seeds/ 模板生成。
 * 写入原子化（tmp + rename）。
 */
const DATA_DIR = path.join(process.cwd(), 'data');
const SEEDS_DIR = path.join(process.cwd(), 'seeds');

export function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(SEEDS_DIR)) {
    const target = path.join(DATA_DIR, file);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(SEEDS_DIR, file), target);
    }
  }
}

export function load(name, fallback) {
  ensureData();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function save(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

let counter = 0;
export function newId(prefix) {
  counter = (counter + 1) % 10000;
  return `${prefix}-${Date.now().toString(36)}${String(counter).padStart(4, '0')}`;
}
