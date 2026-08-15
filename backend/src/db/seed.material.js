import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import {
  materialReceives,
  materialReceiveStyles,
  materialReceiveItems,
  stockHistory,
} from "./schema.mysql.js";

dotenv.config();

// DB connection directly here
const connection = await mysql.createConnection(
  process.env.DATABASE_URL
);

const db = drizzle(connection);

async function seed() {
  try {
    console.log("🌱 Starting seed...");

    // =====================================================
    // 1. MATERIAL RECEIVE
    // =====================================================

    const receiveResult = await db.insert(materialReceives).values({
      date: "2026-08-15",
      invoiceNo: "INV-2026-001",
      fromType: "Supplier",
      warehouse: "K-2",
      buyer: "Decathlon",
      season: "FW26",
      po: "PO-DEC-10001",
      item: "Fabric",
      buy: "FOB",
      remark: "Dummy receive",
      status: "approved",
    });

    const receiveId = receiveResult[0].insertId;

    console.log("Material Receive ID:", receiveId);

    // =====================================================
    // 2. STYLES
    // =====================================================

    await db.insert(materialReceiveStyles).values([
      {
        materialReceiveId: receiveId,
        style: "ST-1001",
        model: "MODEL-A01",
      },
      {
        materialReceiveId: receiveId,
        style: "ST-1002",
        model: "MODEL-B01",
      },
    ]);

    // =====================================================
    // 3. MATERIAL ITEMS / BATCHES
    // =====================================================

    await db.insert(materialReceiveItems).values([
      {
        materialReceiveId: receiveId,
        itemCodePdm: "FAB-001",
        color: "Black",
        rollQty: 50,
        yds: "1250.50",
        availableRoll: 50,
        availableYds: "1250.50",
        location: "K2-A-01",
        status: "approved",
        approvedAt: new Date(),
      },

      {
        materialReceiveId: receiveId,
        itemCodePdm: "FAB-001",
        color: "Navy",
        rollQty: 30,
        yds: "750.00",
        availableRoll: 30,
        availableYds: "750.00",
        location: "K2-A-02",
        status: "approved",
        approvedAt: new Date(),
      },

      {
        materialReceiveId: receiveId,
        itemCodePdm: "FAB-002",
        color: "Grey",
        rollQty: 20,
        yds: "500.25",
        availableRoll: 20,
        availableYds: "500.25",
        location: "K2-B-01",
        status: "approved",
        approvedAt: new Date(),
      },
    ]);

    // =====================================================
    // 4. GET CREATED BATCHES
    // =====================================================

    const batches = await db
      .select()
      .from(materialReceiveItems);

    const receiveBatches = batches.filter(
      (batch) => batch.materialReceiveId === receiveId
    );

    // =====================================================
    // 5. STOCK HISTORY
    // =====================================================

    for (const batch of receiveBatches) {
      // RECEIVE
      await db.insert(stockHistory).values({
        batchId: batch.id,
        materialReceiveId: receiveId,
        action: "receive",
        location: null,
        rollQty: batch.rollQty,
        yds: batch.yds,
        note: "Material received",
      });

      // LOCATION ASSIGNMENT
      await db.insert(stockHistory).values({
        batchId: batch.id,
        materialReceiveId: receiveId,
        action: "location_assignment",
        location: batch.location,
        rollQty: batch.rollQty,
        yds: batch.yds,
        note: `Assigned to ${batch.location}`,
      });
    }

    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
  } finally {
    await connection.end();
  }
}

seed();