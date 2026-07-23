const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const r2Client = require('./r2Client');

/**
 * Checks the magic numbers of a buffer to verify if it matches a valid image type.
 * Supports PNG, JPEG, GIF, and WEBP.
 * @param {Buffer} buffer 
 * @returns {string|null} Detected MIME type or null
 */
function checkImageMagicNumbers(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Fetches the magic number header range of an R2 object and validates its content.
 * If invalid, automatically deletes the file from R2.
 * @param {string} key R2 Storage Key
 * @returns {Promise<{isValid: boolean, mimeType: string|null}>}
 */
async function validateR2ImageFile(key) {
  const getCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Range: 'bytes=0-11',
  });

  const r2Response = await r2Client.send(getCommand);
  const chunks = [];

  for await (const chunk of r2Response.Body) {
    chunks.push(chunk);
  }
  const headerBuffer = Buffer.concat(chunks);
  const mimeType = checkImageMagicNumbers(headerBuffer);

  if (!mimeType) {
    // Delete unverified file from R2
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    return { isValid: false, mimeType: null };
  }

  return { isValid: true, mimeType };
}

/**
 * Extracts the storage key from a public R2 image URL and deletes the object from Cloudflare R2.
 * @param {string} imageUrl 
 * @returns {Promise<boolean>}
 */
async function deleteR2FileByUrl(imageUrl) {
  if (!imageUrl) return false;

  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  const key = imageUrl.replace(`${publicDomain}/`, '');

  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (err) {
    console.error('Failed to delete object from R2:', err);
    return false;
  }
}

module.exports = {
  checkImageMagicNumbers,
  validateR2ImageFile,
  deleteR2FileByUrl,
};
