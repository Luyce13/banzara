const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  endpoint: process.env.S3_ENDPOINT,
});

async function listFiles() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      Prefix: "avatars/",
    });
    const response = await s3.send(command);
    console.log("S3 Objects (avatars/):");
    if (response.Contents) {
      response.Contents.forEach((item) => {
        console.log(`- ${item.Key} (${item.Size} bytes)`);
      });
    } else {
      console.log("No objects found.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Error listing S3 objects:", err);
    process.exit(1);
  }
}

listFiles();
