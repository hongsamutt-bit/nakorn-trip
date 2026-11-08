// Local SQLite database using Node's built-in `node:sqlite` (Node 22.13+).
// Exposes the small prepare/bind/first/all/run/batch API that server/api.ts uses.
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

type Value = string | number | bigint | null | Uint8Array;

export class Statement {
  private args: Value[] = [];
  constructor(private db: DatabaseSync, private sql: string) {}
  bind(...args: unknown[]) {
    const s = new Statement(this.db, this.sql);
    s.args = args.map(a => (a === undefined ? null : (a as Value)));
    return s;
  }
  private stmt(): StatementSync { return this.db.prepare(this.sql); }
  async first<T>(): Promise<T | null> { return (this.stmt().get(...this.args) as T | undefined) ?? null; }
  async all<T>(): Promise<{ results: T[] }> { return { results: this.stmt().all(...this.args) as T[] }; }
  async run(): Promise<{ meta: { changes: number } }> {
    const r = this.stmt().run(...this.args);
    return { meta: { changes: Number(r.changes) } };
  }
  /** Synchronous run used inside batch transactions. */
  runSync() { this.stmt().run(...this.args); }
}

export class Database {
  constructor(private db: DatabaseSync) {}
  prepare(sql: string) { return new Statement(this.db, sql); }
  /** Runs all statements in one SQLite transaction (all succeed or none). */
  async batch(statements: Statement[]) {
    this.db.exec("BEGIN");
    try { for (const s of statements) s.runSync(); this.db.exec("COMMIT"); }
    catch (e) { this.db.exec("ROLLBACK"); throw e; }
  }
}

const globalForDb = globalThis as unknown as { nakornDb?: Database };

export function getDb(): Database {
  if (globalForDb.nakornDb) return globalForDb.nakornDb;
  const file = process.env.DATABASE_FILE || join(process.cwd(), "data", "nakorn-trip.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  raw.exec(readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8"));
  globalForDb.nakornDb = new Database(raw);
  return globalForDb.nakornDb;
}
