import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/db.js";

const { json_payload_tests } = schema;

function normalizePayload(payload) {
    if (!Array.isArray(payload)) {
        return null;
    }

    const cleaned = payload.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item)
    );

    return cleaned.length === payload.length ? cleaned : null;
}

export async function createPayloadTest(req, res) {
    try {
        const { title, payload } = req.body;

        if (!title || typeof title !== "string") {
            return res.status(400).json({ message: "Title is required." });
        }

        const cleanedPayload = normalizePayload(payload);
        if (!cleanedPayload || cleanedPayload.length === 0) {
            return res.status(400).json({ message: "Payload must be an array of objects." });
        }

        const [result] = await db.insert(json_payload_tests).values({
            title: title.trim(),
            payload: cleanedPayload,
            item_count: cleanedPayload.length,
        });

        const [record] = await db
            .select()
            .from(json_payload_tests)
            .where(eq(json_payload_tests.id, result.insertId));

        return res.status(201).json({
            message: "Payload test saved.",
            record,
        });
    } catch (error) {
        console.error("createPayloadTest error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}

export async function getPayloadTests(req, res) {
    try {
        const records = await db
            .select()
            .from(json_payload_tests)
            .orderBy(desc(json_payload_tests.createdAt));

        return res.status(200).json({ records });
    } catch (error) {
        console.error("getPayloadTests error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}