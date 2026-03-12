const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const errorHandler = require("./middlewares/error");
const sanitizer = require("./middlewares/sanitizer");
const ApiError = require("./utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const logger = require("./utils/logger").child({ context: "App" });
const { API_CONFIG } = require("./constants");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  morgan("dev", {
    stream: {
      write: (message) => logger.info({ context: "HTTP" }, message.trim()),
    },
  }),
);

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// parse cookies
app.use(cookieParser());

// enable cors
app.use(cors("*"));

// sanitize request data (in-place NoSQL & XSS)
app.use(sanitizer);

// v1 api routes
app.use(API_CONFIG.PREFIX, routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(
    new ApiError(
      httpStatus.NOT_FOUND,
      `${req.method} ${req.originalUrl} not found`,
    ),
  );
});

// handle error
app.use(errorHandler);

module.exports = app;
