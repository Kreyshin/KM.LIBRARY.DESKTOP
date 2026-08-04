const { existsSync, readFileSync, readdirSync } = require('fs');
const Module = require('module');
const path = require('path');

async function main() {
  const [clientPath, migrationsDir] = process.argv.slice(2);
  if (!clientPath || !migrationsDir) throw new Error('Faltan las rutas del cliente Prisma o las migraciones.');
  process.env.NODE_PATH = path.resolve(path.dirname(clientPath), '..', '..');
  Module._initPaths();
  const { PrismaClient } = require(clientPath);
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_karma_migrations" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const applied = new Set((await prisma.$queryRawUnsafe('SELECT "name" FROM "_karma_migrations"')).map((row) => row.name));
    const directories = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of directories) {
      if (applied.has(name)) continue;
      const file = path.join(migrationsDir, name, 'migration.sql');
      if (!existsSync(file)) continue;
      const statements = readFileSync(file, 'utf8').split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
      await prisma.$transaction(async (transaction) => {
        for (const statement of statements) await transaction.$executeRawUnsafe(statement);
        await transaction.$executeRawUnsafe('INSERT INTO "_karma_migrations" ("name") VALUES (?)', name);
      });
    }
  } finally { await prisma.$disconnect(); }
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
