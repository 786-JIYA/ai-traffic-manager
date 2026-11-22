
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const pool = require("./src/config/db");

async function runMigration() {
    const client = await pool.connect();

    try {
        const migrationPath = path.join(
            __dirname,
            "migrations",
            "001_initial_schema.sql"
        );

        const sql = fs.readFileSync(
            migrationPath,
            "utf8"
        );

        await client.query("BEGIN");

        await client.query(sql);

        await client.query("COMMIT");

        console.log("Initial database migration completed!");

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Migration failed:", error.message);

    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
