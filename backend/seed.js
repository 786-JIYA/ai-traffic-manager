
require("dotenv").config();

const pool = require("./src/config/db");

const approaches = [
    "bottom_left",
    "top_center",
    "left_side",
    "right_side",
    "bottom_right_slip"
];

async function seedDatabase() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Create or retrieve the intersection
        const intersectionResult = await client.query(
            `INSERT INTO intersections (
                intersection_key,
                name
            )
            VALUES ($1, $2)
            ON CONFLICT (intersection_key)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING id`,
            [
                "intersection_01",
                "Traffic Video 6 Intersection"
            ]
        );

        const intersectionId = intersectionResult.rows[0].id;

        // 2. Register all five approaches
        for (const approach of approaches) {
            await client.query(
                `INSERT INTO approaches (
                    intersection_id,
                    approach_key,
                    name
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (intersection_id, approach_key)
                DO UPDATE SET name = EXCLUDED.name`,
                [
                    intersectionId,
                    approach,
                    approach.replaceAll("_", " ")
                ]
            );
        }

        await client.query("COMMIT");

        console.log("Database seeding completed!");
        console.log("Intersection ID:", intersectionId);
        console.log("Registered approaches:", approaches.length);

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Seeding failed:", error.message);

    } finally {
        client.release();
        await pool.end();
    }
}

seedDatabase();
