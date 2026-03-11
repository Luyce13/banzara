const xss = require("xss");

/**
 * Recursively removes keys starting with $ or containing . (NoSQL injection)
 * Operates in-place to avoid Express 5 read-only property errors.
 */
function sanitizeMongo(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      sanitizeMongo(obj[key]);
    }
  }
}

/**
 * Recursively escapes string values to prevent XSS.
 * Operates in-place to avoid Express 5 read-only property errors.
 */
function sanitizeXss(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === "object") {
      sanitizeXss(obj[key]);
    }
  }
}

const sanitizer = (req, res, next) => {
  if (req.body) {
    sanitizeMongo(req.body);
    sanitizeXss(req.body);
  }
  if (req.query) {
    sanitizeMongo(req.query);
    sanitizeXss(req.query);
  }
  if (req.params) {
    sanitizeMongo(req.params);
    sanitizeXss(req.params);
  }
  next();
};

module.exports = sanitizer;
