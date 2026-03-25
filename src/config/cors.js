const ALLOWED_ORIGINS = {
  production: [/^http:\/\/localhost:\d+$/],
  development: [/^http:\/\/localhost:\d+$/, "https://bazaarna-zone.vercel.app"],
};

const logger = require("../utils/logger").child({ context: "CORS" });

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const patterns = ALLOWED_ORIGINS[process.env.NODE_ENV || "development"];

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(origin);
    if (pattern.includes("*")) {
      return new RegExp("^" + pattern.replace("*", ".*") + "$").test(origin);
    }
    return pattern === origin;
  });
};

const corsConfig = {
  credentials: true,
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.fatal(`CORS blocked origin: ${origin}`);
      callback(new Error(`${origin} is not allowed by CORS`));
    }
  },
};

module.exports = corsConfig;
