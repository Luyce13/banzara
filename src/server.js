require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { ENV } = require("./constants");
const mongoose = require("mongoose");
const app = require("./app");
const logger = require("./utils/logger").child({ context: "Server" });
const { initLifecycleJobs } = require("./utils/lifecycle.job");

let server;
const PORT = ENV.PORT;
const DB_URI = ENV.MONGODB_URI;

server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Listening to port http://localhost:${PORT}`);
});

mongoose
  .connect(DB_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
    initLifecycleJobs();
  })
  .catch((err) => {
    logger.error(err, "Failed to connect to MongoDB");
  });

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.fatal(error, "Unexpected error encountered");
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close();
  }
});
