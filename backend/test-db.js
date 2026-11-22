
require("dotenv").config();

const pool = require("./src/config/db");

async function testDatabaseConnection() {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database_name,
                NOW() AS server_time
        `);

        console.log("PostgreSQL connected successfully!");
        console.log(result.rows[0]);

    } catch (error) {
        console.error("Database connection failed:", error.message);

    } finally {
        await pool.end();
    }
}

testDatabaseConnection();
