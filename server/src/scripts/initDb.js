// Tạo CSDL và các bảng từ database/schema.sql
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, '../../../database/schema.sql');

let sql = await fs.readFile(schemaPath, 'utf8');
if (env.db.database !== 'edutrack') sql = sql.replaceAll('edutrack', env.db.database);

const conn = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  multipleStatements: true,
});
await conn.query(sql);
await conn.end();
console.log(`Đã khởi tạo CSDL "${env.db.database}".`);
