import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_TRANSFORMATION = [
  { width: 400, height: 400, crop: "fill", gravity: "face" },
];

/**
 * Upload a base64 image string to Cloudinary
 * @param {string} base64Image - full data URI e.g. "data:image/png;base64,..."
 * @param {string} folder - Cloudinary folder name
 * @param {object[]} [transformation] - Cloudinary transformation array. Defaults
 *   to the 400x400 face-crop used for profile pictures; pass your own (e.g. a
 *   plain resize/limit) for non-avatar images like product photos.
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadToCloudinary(
  base64Image,
  folder = "profile_pictures",
  transformation = DEFAULT_TRANSFORMATION
) {
  const result = await cloudinary.uploader.upload(base64Image, {
    folder,
    resource_type: "image",
    transformation,
  });
  return { url: result.secure_url, public_id: result.public_id };
}

/**
 * Delete an image from Cloudinary by its URL or public_id
 * @param {string} urlOrPublicId
 */
export async function deleteFromCloudinary(urlOrPublicId) {
  if (!urlOrPublicId) return;

  let public_id = urlOrPublicId;

  // If it's a full URL, extract the public_id
  if (urlOrPublicId.startsWith("http")) {
    // e.g. https://res.cloudinary.com/cloud/image/upload/v123/profile_pictures/abc123.jpg
    const matches = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (matches) public_id = matches[1];
  }

  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
}