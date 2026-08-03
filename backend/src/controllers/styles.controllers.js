// backend/src/controllers/styles.controllers.js

import { desc, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import {
  STYLE_STATUS_VALUES,
  style_releases,
  styles,
} from "../db/schema.mysql.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary.js";

// Product photos shouldn't go through the profile-picture face-crop —
// just cap the size so nothing huge lands in the DB/Cloudinary.
const STYLE_IMAGE_TRANSFORMATION = [{ width: 1200, crop: "limit" }];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

// Resolves an incoming `images` array against what the style already has:
// - a "data:" URI is a fresh upload -> pushed to Cloudinary, real URL kept
// - anything else (an existing https:// URL) is kept as-is
// - any previously-stored URL that's no longer present gets deleted from
//   Cloudinary so removed images don't pile up there
async function resolveImages(incoming, previous = []) {
  const finalUrls = [];
  for (const img of incoming) {
    if (typeof img === "string" && img.startsWith("data:")) {
      const { url } = await uploadToCloudinary(
        img,
        "style_images",
        STYLE_IMAGE_TRANSFORMATION
      );
      finalUrls.push(url);
    } else if (typeof img === "string") {
      finalUrls.push(img);
    }
  }

  const kept = new Set(finalUrls);
  const removed = previous.filter((url) => !kept.has(url));
  await Promise.all(removed.map((url) => deleteFromCloudinary(url)));

  return finalUrls;
}

// Attaches each style's releases (and computed total qty) in one extra query
// instead of N+1 queries per style.
async function attachReleases(styleRows) {
  if (styleRows.length === 0) return [];

  const styleIds = styleRows.map((s) => s.id);

  // Fetch every release once and group in JS — avoids N+1 queries per style.
  const releasesByStyle = new Map();
  const all = await db.select().from(style_releases);
  for (const r of all) {
    if (!styleIds.includes(r.style_id)) continue;
    if (!releasesByStyle.has(r.style_id)) releasesByStyle.set(r.style_id, []);
    releasesByStyle.get(r.style_id).push(r);
  }

  return styleRows.map((s) => {
    const releases = (releasesByStyle.get(s.id) || []).sort(
      (a, b) => new Date(b.release_date) - new Date(a.release_date)
    );
    const totalQty = releases.reduce((sum, r) => sum + r.qty, 0);
    return { ...s, releases, totalQty };
  });
}

/* ------------------------------------------------------------------ */
/* controllers                                                         */
/* ------------------------------------------------------------------ */

// POST /styles
export const createStyle = async (req, res) => {
  try {
    const {
      customerName,
      brand,
      styleName,
      styleNumber,
      description,
      model,
      color,
      seasonYear,
      season,
      productType,
      status,
      image,
      images,
      qty,
      userId, // optional, from auth context
    } = req.body;

    if (!customerName || !styleName || !styleNumber) {
      return res.status(400).json({
        message: "customerName, styleName and styleNumber are required.",
      });
    }

    // NOTE: the style_number "already exists" conflict check that used to
    // live here has been removed — the same style number can now be
    // registered multiple times (e.g. duplicating a row as a new entry).
    // This also requires dropping the unique index on styles.style_number
    // in the database itself (see the migration note below).

    const finalImages = Array.isArray(images)
      ? await resolveImages(images, [])
      : [];

    const [inserted] = await db.insert(styles).values({
      customer_name: customerName,
      brand: brand || null,
      style_name: styleName,
      style_number: styleNumber,
      description: description || null,
      model: model || null,
      color: color || null,
      season_year: seasonYear || null,
      season: season || null,
      product_type: productType || null,
      status: STYLE_STATUS_VALUES.includes(status) ? status : "Pending",
      image: image || finalImages[0] || null,
      images: finalImages,
      is_active: true,
      created_by: userId || null,
    });

    const newStyleId = inserted.insertId;

    // If an initial order qty was submitted with the style, record it as
    // the first release — this also stamps its own adding date-time.
    if (qty) {
      await db.insert(style_releases).values({
        style_id: newStyleId,
        qty: Number(qty),
        created_by: userId || null,
      });
    }

    const [created] = await db
      .select()
      .from(styles)
      .where(eq(styles.id, newStyleId));
    const [withReleases] = await attachReleases([created]);

    return res.status(201).json(withReleases);
  } catch (err) {
    console.error("createStyle error:", err);
    return res.status(500).json({ message: "Failed to create style." });
  }
};

// GET /styles
export const getAllStyles = async (req, res) => {
  try {
    const rows = await db.select().from(styles).orderBy(desc(styles.submitted_at));
    const withReleases = await attachReleases(rows);
    return res.json(withReleases);
  } catch (err) {
    console.error("getAllStyles error:", err);
    return res.status(500).json({ message: "Failed to fetch styles." });
  }
};

// GET /styles/:id
export const getStyleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db.select().from(styles).where(eq(styles.id, id));
    if (!row) return res.status(404).json({ message: "Style not found." });
    const [withReleases] = await attachReleases([row]);
    return res.json(withReleases);
  } catch (err) {
    console.error("getStyleById error:", err);
    return res.status(500).json({ message: "Failed to fetch style." });
  }
};

// PUT /styles/:id
export const updateStyle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      brand,
      styleName,
      styleNumber,
      description,
      model,
      color,
      seasonYear,
      season,
      productType,
      status,
      image,
      images,
      isActive,
    } = req.body;

    const [existing] = await db.select().from(styles).where(eq(styles.id, id));
    if (!existing) return res.status(404).json({ message: "Style not found." });

    if (status && !STYLE_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    let finalImages = existing.images || [];
    if (Array.isArray(images)) {
      finalImages = await resolveImages(images, existing.images || []);
    }

    await db
      .update(styles)
      .set({
        customer_name: customerName ?? existing.customer_name,
        brand: brand ?? existing.brand,
        style_name: styleName ?? existing.style_name,
        style_number: styleNumber ?? existing.style_number,
        description: description ?? existing.description,
        model: model ?? existing.model,
        color: color ?? existing.color,
        season_year: seasonYear ?? existing.season_year,
        season: season ?? existing.season,
        product_type: productType ?? existing.product_type,
        status: status ?? existing.status,
        image: image ?? finalImages[0] ?? existing.image,
        images: finalImages,
        is_active: typeof isActive === "boolean" ? isActive : existing.is_active,
        // updated_at is refreshed automatically on every UPDATE (onUpdateNow)
      })
      .where(eq(styles.id, id));

    const [updated] = await db.select().from(styles).where(eq(styles.id, id));
    const [withReleases] = await attachReleases([updated]);

    return res.json(withReleases);
  } catch (err) {
    console.error("updateStyle error:", err);
    return res.status(500).json({ message: "Failed to update style." });
  }
};

// PATCH /styles/:id/toggle-active
export const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(styles).where(eq(styles.id, id));
    if (!existing) return res.status(404).json({ message: "Style not found." });

    await db
      .update(styles)
      .set({ is_active: !existing.is_active })
      .where(eq(styles.id, id));

    return res.json({ id: Number(id), isActive: !existing.is_active });
  } catch (err) {
    console.error("toggleActive error:", err);
    return res.status(500).json({ message: "Failed to toggle status." });
  }
};

// POST /styles/:id/release
export const addRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const { qty, userId } = req.body;

    if (!qty || Number(qty) <= 0) {
      return res.status(400).json({ message: "A positive qty is required." });
    }

    const [existing] = await db.select().from(styles).where(eq(styles.id, id));
    if (!existing) return res.status(404).json({ message: "Style not found." });

    // release_date defaults to NOW() at the DB level, so the adding
    // date-time is captured automatically.
    const [inserted] = await db.insert(style_releases).values({
      style_id: Number(id),
      qty: Number(qty),
      created_by: userId || null,
    });

    const [release] = await db
      .select()
      .from(style_releases)
      .where(eq(style_releases.id, inserted.insertId));

    return res.status(201).json(release);
  } catch (err) {
    console.error("addRelease error:", err);
    return res.status(500).json({ message: "Failed to add release." });
  }
};

// PUT /styles/:id/release/:releaseId
export const updateRelease = async (req, res) => {
  try {
    const { id, releaseId } = req.params;
    const { qty } = req.body;

    if (!qty || Number(qty) <= 0) {
      return res.status(400).json({ message: "A positive qty is required." });
    }

    const [existing] = await db
      .select()
      .from(style_releases)
      .where(eq(style_releases.id, releaseId));
    if (!existing || existing.style_id !== Number(id)) {
      return res.status(404).json({ message: "Release not found." });
    }

    await db
      .update(style_releases)
      .set({ qty: Number(qty) })
      .where(eq(style_releases.id, releaseId));

    const [updated] = await db
      .select()
      .from(style_releases)
      .where(eq(style_releases.id, releaseId));

    return res.json(updated);
  } catch (err) {
    console.error("updateRelease error:", err);
    return res.status(500).json({ message: "Failed to update release." });
  }
};

// DELETE /styles/:id/release/:releaseId
export const deleteRelease = async (req, res) => {
  try {
    const { id, releaseId } = req.params;

    const [existing] = await db
      .select()
      .from(style_releases)
      .where(eq(style_releases.id, releaseId));
    if (!existing || existing.style_id !== Number(id)) {
      return res.status(404).json({ message: "Release not found." });
    }

    await db.delete(style_releases).where(eq(style_releases.id, releaseId));

    return res.json({ message: "Release deleted." });
  } catch (err) {
    console.error("deleteRelease error:", err);
    return res.status(500).json({ message: "Failed to delete release." });
  }
};

// DELETE /styles/:id
export const deleteStyle = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(styles).where(eq(styles.id, id));
    if (!existing) return res.status(404).json({ message: "Style not found." });

    await db.delete(style_releases).where(eq(style_releases.style_id, id));
    await db.delete(styles).where(eq(styles.id, id));
    await Promise.all((existing.images || []).map((url) => deleteFromCloudinary(url)));

    return res.json({ message: "Style deleted." });
  } catch (err) {
    console.error("deleteStyle error:", err);
    return res.status(500).json({ message: "Failed to delete style." });
  }
};