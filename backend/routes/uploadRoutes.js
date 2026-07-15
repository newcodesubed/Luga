const express = require('express');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const r2Client = require('../utils/r2Client');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

/**
 * @route POST /api/upload/presigned-url
 * @desc Generate a pre-signed URL for client-side direct upload to Cloudflare R2
 * @access Private (Requires JWT Token)
 */
router.post('/presigned-url', authenticateToken, async (req, res, next) => {
  const { fileType, fileName } = req.body;

  if (!fileType) {
    return res.status(400).json({
      status: 'fail',
      message: 'fileType (e.g., image/jpeg) is required',
    });
  }

  // Allow only images for security
  if (!fileType.startsWith('image/')) {
    return res.status(400).json({
      status: 'fail',
      message: 'Only image files are allowed',
    });
  }

  try {
    // Generate a unique object key to prevent conflicts
    const fileExtension = fileType.split('/')[1] || 'jpg';
    const uniqueId = crypto.randomUUID();
    const cleanFileName = fileName 
      ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_') 
      : `${uniqueId}.${fileExtension}`;
    
    const objectKey = `users/${req.user.id}/${uniqueId}-${cleanFileName}`;

    // Configure the PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
    });

    // Generate pre-signed URL valid for 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    // Construct the public access URL using the R2 custom public domain
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${objectKey}`;

    res.status(200).json({
      status: 'success',
      data: {
        uploadUrl,
        publicUrl,
        key: objectKey,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
