const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 8000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || "thisisasamplesecret",
  JWT_ACCESS_EXPIRATION_MINUTES: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
  JWT_REFRESH_EXPIRATION_DAYS: process.env.JWT_REFRESH_EXPIRATION_DAYS || 30,
  JWT_RESET_PASSWORD_EXPIRATION_MINUTES: process.env.JWT_RESET_PASSWORD_EXPIRATION_MINUTES || 10,
  JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: process.env.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES || 10,
  AUTH_STRATEGY: process.env.AUTH_STRATEGY || "dual", // Can be 'dual' (cookies + refresh map) or 'single' (basic payload access token)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USERNAME: process.env.SMTP_USERNAME,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || "support@banzara.com",
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION || "us-east-1",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_ENDPOINT: process.env.S3_ENDPOINT, // Optional for S3-compatible storage
};

const LOG_CONFIG = {
  DIR: "logs",
  RETENTION_DAYS: 3,
  ROTATION_INTERVAL: "1d",
  VIEW: "simple",
  LEVEL: "info",
  ENABLE_FILE_LOGGING: process.env.LOG_ENABLE_FILES !== "false",
};

const API_CONFIG = {
  VERSION: "v1",
  PREFIX: "/api/v1",
};

module.exports = {
  ENV,
  LOG_CONFIG,
  API_CONFIG,
};
