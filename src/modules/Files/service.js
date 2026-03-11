const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");
const File = require("./model");
const ApiError = require("../../utils/ApiError");
const { ENV } = require("../../constants");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const logger = require("../../utils/logger").child({ context: "Files" });

const s3 = new S3Client({
  region: ENV.S3_REGION,
  credentials: {
    accessKeyId: ENV.S3_ACCESS_KEY,
    secretAccessKey: ENV.S3_SECRET_KEY,
  },
  ...(ENV.S3_ENDPOINT ? { endpoint: ENV.S3_ENDPOINT } : {}),
});

const calculateHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

const uploadToS3 = async (file, folder = "general") => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const key = `banzarna/${folder}/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;

  const command = new PutObjectCommand({
    Bucket: ENV.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
    Metadata: {
      originalName: file.originalname,
    },
  });

  await s3.send(command);

  const url = ENV.S3_ENDPOINT
    ? `${ENV.S3_ENDPOINT}/${ENV.S3_BUCKET}/${key}`
    : `https://${ENV.S3_BUCKET}.s3.${ENV.S3_REGION}.amazonaws.com/${key}`;

  return { url, key };
};

const getOrCreateFile = async (file, folder) => {
  const hash = calculateHash(file.buffer);

  let existingFile = await File.findOne({ hash });

  if (existingFile) {
    existingFile.refCount += 1;
    await existingFile.save();
    return existingFile;
  }

  const { url, key } = await uploadToS3(file, folder);

  return File.create({
    url,
    key,
    mimetype: file.mimetype,
    size: file.size,
    hash,
    refCount: 1,
  });
};

const getFileById = async (id) => {
  const file = await File.findById(id);
  if (!file) {
    throw new ApiError(httpStatus.NOT_FOUND, "File not found");
  }
  return file;
};

const incrementRefCount = async (id) => {
  if (!id) return;
  await File.findByIdAndUpdate(id, { $inc: { refCount: 1 } });
};

const decrementRefCount = async (id) => {
  if (!id) return;
  const file = await File.findById(id);
  if (!file) return;

  file.refCount -= 1;

  if (file.refCount <= 0) {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: ENV.S3_BUCKET,
      Key: file.key,
    });
    try {
      await s3.send(deleteCommand);
    } catch (error) {
      logger.error(`Failed to delete S3 object ${file.key}:`, error);
    }
    await file.deleteOne();
    logger.info(`File and S3 object deleted successfully ${file.key}`);
  } else {
    await file.save();
    logger.info(`File refCount decremented successfully ${file.key}`);
  }
};

module.exports = {
  getOrCreateFile,
  getFileById,
  incrementRefCount,
  decrementRefCount,
};
