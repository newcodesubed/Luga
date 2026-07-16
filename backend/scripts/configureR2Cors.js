const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '../.env') });

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      AllowedOrigins: ["http://localhost:5173"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600
    }
  ]
};

async function setCors() {
  try {
    console.log(`Applying CORS configuration to R2 bucket: ${process.env.R2_BUCKET_NAME}...`);
    const command = new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    await r2Client.send(command);
    console.log("CORS Configuration applied successfully to R2 bucket!");
    process.exit(0);
  } catch (error) {
    console.error("Error configuring CORS:", error);
    process.exit(1);
  }
}

setCors();
