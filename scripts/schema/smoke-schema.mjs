import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const schemaPath = path.join(repoRoot, 'database', 'schema.sql');

function fail(message, detail) {
  console.error(`schema smoke failed: ${message}`);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

function queryRows(db, sql) {
  const result = db.exec(sql);
  if (result.length === 0) {
    return [];
  }

  const [{ columns, values }] = result;
  return values.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]])),
  );
}

function assertNoRows(rows, message) {
  if (rows.length > 0) {
    fail(message, JSON.stringify(rows, null, 2));
  }
}

function assertSingleCount(db, tableName, minimumCount) {
  const [{ count }] = queryRows(db, `SELECT COUNT(*) AS count FROM ${tableName};`);
  if (count < minimumCount) {
    fail(`${tableName} has ${count} seeded rows; expected at least ${minimumCount}`);
  }
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

if (!fs.existsSync(schemaPath)) {
  fail(`schema file not found at ${schemaPath}`);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const SQL = await initSqlJs();
const db = new SQL.Database();

try {
  db.run('PRAGMA foreign_keys = ON;');
  db.run(schemaSql);
} catch (error) {
  fail('schema.sql could not be applied to an empty in-memory SQLite database', error.stack);
}

assertNoRows(queryRows(db, 'PRAGMA foreign_key_check;'), 'seed data violates foreign keys');

const requiredConditionTypes = queryRows(
  db,
  `
  SELECT DISTINCT c.condition_type_id
  FROM condition c
  LEFT JOIN enum_condition_type ect
    ON ect.condition_type_id = c.condition_type_id
  WHERE ect.condition_type_id IS NULL;
  `,
);
assertNoRows(requiredConditionTypes, 'condition seed rows reference missing enum_condition_type values');

const expectedConditionTypes = ['debt_bound', 'exhausted'];
for (const conditionType of expectedConditionTypes) {
  const [{ count }] = queryRows(
    db,
    `SELECT COUNT(*) AS count FROM enum_condition_type WHERE condition_type_id = '${conditionType}';`,
  );
  if (count !== 1) {
    fail(`expected enum_condition_type.${conditionType} to be seeded exactly once`);
  }
}

const views = queryRows(
  db,
  `
  SELECT name
  FROM sqlite_schema
  WHERE type = 'view'
  ORDER BY name;
  `,
);

for (const { name } of views) {
  try {
    db.exec(`SELECT * FROM ${quoteIdentifier(name)} LIMIT 1;`);
  } catch (error) {
    fail(`view ${name} is not queryable`, error.stack);
  }
}

try {
  db.run(`
    UPDATE npc
    SET is_alive = 0,
        death_type_id = 'combat',
        death_description = 'schema smoke test'
    WHERE npc_id = (
      SELECT npc_id
      FROM npc
      WHERE (stat_presence >= 12 OR faction_rank = 'leader')
        AND is_alive = 1
      LIMIT 1
    );
  `);
} catch (error) {
  fail('NPC death cascade trigger failed FK validation', error.stack);
}

assertNoRows(
  queryRows(db, 'PRAGMA foreign_key_check;'),
  'foreign keys fail after NPC death cascade smoke update',
);

const seedMinimums = new Map([
  ['enum_event_type', 1],
  ['enum_item_type', 1],
  ['enum_condition_type', 1],
  ['enum_death_type', 1],
  ['enum_consequence_trigger', 1],
  ['campaign', 1],
  ['region', 1],
  ['location', 1],
  ['faction', 1],
  ['npc', 1],
  ['player', 1],
  ['condition', 1],
]);

for (const [tableName, minimumCount] of seedMinimums) {
  assertSingleCount(db, tableName, minimumCount);
}

console.log('schema smoke passed');
console.log(`views queried: ${views.map(({ name }) => name).join(', ')}`);
console.log(`seed tables checked: ${[...seedMinimums.keys()].join(', ')}`);
