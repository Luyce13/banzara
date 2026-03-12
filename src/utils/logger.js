const pino = require("pino");
const { format } = require("date-fns");
const { yellow, green, red, gray } = require("colorette");
const rfs = require("rotating-file-stream");
const path = require("path");
const fs = require("fs");
const { Writable } = require("stream");
const { ENV, LOG_CONFIG } = require("../constants");
const logDir = path.join(process.cwd(), LOG_CONFIG.DIR);
if (LOG_CONFIG.ENABLE_FILE_LOGGING && !fs.existsSync(logDir)) fs.mkdirSync(logDir);

const rfsOptions = {
  interval: LOG_CONFIG.ROTATION_INTERVAL, // Daily rotation
  maxFiles: LOG_CONFIG.RETENTION_DAYS, // 3 days retention
  path: logDir,
};

let detailedStream, detailedErrorStream, conciseStream, conciseErrorStream;

if (LOG_CONFIG.ENABLE_FILE_LOGGING) {
  detailedStream = rfs.createStream("detailed.log", rfsOptions);
  detailedErrorStream = rfs.createStream("detailed-error.log", rfsOptions);
  conciseStream = rfs.createStream("concise.log", rfsOptions);
  conciseErrorStream = rfs.createStream("concise-error.log", rfsOptions);
}

const formatTime = (date) => format(date, "dd/MM/yyyy, hh:mm:ss a");
const formatTimeSimple = (date) => format(date, "hh:mm:ss a");

const stripAnsi = (str) =>
  typeof str === "string" ? str.replace(/\u001b\[\d+m/g, "") : str;

const buildLogString = (logObj, isColor = false, isSimple = false) => {
  const { level, time, msg, context, pid, err, stack } = logObj;
  const rawCtx = context || "App";
  const ctx = `[${rawCtx}]`.padEnd(10);
  const logType = (
    {
      10: "TRACE",
      20: "DEBUG",
      30: "INFO",
      40: "WARN",
      50: "ERROR",
      60: "FATAL",
    }[level] || "INFO"
  ).padEnd(5);

  const dateObj = new Date(time);
  let out = "";
  // Force stripping ANSI from the msg in case it is piped from Morgan (with color)
  const rawMsgStr = msg || (err && err.message) || "";
  const messageStr = isColor ? rawMsgStr : stripAnsi(rawMsgStr);

  let prefixStr = "";
  if (isSimple) {
    const timeStr = formatTimeSimple(dateObj);
    prefixStr = `${timeStr} ${logType} ${ctx} `;
    const logTypeColored = level >= 50 ? red(logType) : green(logType);
    out = isColor
      ? `${timeStr} ${logTypeColored} ${yellow(ctx)} ${green(messageStr)}`
      : stripAnsi(`${prefixStr}${messageStr}`);
  } else {
    const timeStr = formatTime(dateObj);
    prefixStr = `[${pid}] - ${timeStr} ${logType} ${ctx} `;
    const logTypeColored = level >= 50 ? red(logType) : green(logType);
    out = isColor
      ? `${yellow(`[${pid}] - `)}${timeStr} ${logTypeColored} ${yellow(ctx)} ${green(rawMsgStr)}`
      : `[${pid}] - ${timeStr} ${logType} ${ctx} ${messageStr}`;
  }

  const stackToPrint = (err && err.stack) || stack;
  if (stackToPrint) {
    let stackLines = stackToPrint.split("\n");

    if (isColor) {
      // Filter out node_modules and internal node stack frames for console
      stackLines = stackLines.filter(
        (line) =>
          !line.includes("node_modules") &&
          !line.includes("node:internal") &&
          !line.includes("(internal/"),
      );
    }

    // Skip the first line of the stack trace (the "Error: message" line)
    // because the message is already printed in the main log line.
    if (stackLines.length > 0) {
      stackLines.shift();
    }

    out +=
      stackLines.length > 0
        ? "\n" +
          stackLines
            .map((line) => (isColor ? gray(line) : stripAnsi(line)))
            .join("\n")
        : "";
  }

  return out + "\n";
};

const createStreamWriter = (type) => {
  return new Writable({
    write(chunk, encoding, callback) {
      try {
        const logObj = JSON.parse(chunk.toString());
        const isError = logObj.level >= 50;

        if (type === "console") {
          const isSimple = LOG_CONFIG.VIEW === "simple";
          process.stdout.write(buildLogString(logObj, true, isSimple));
        } else if (type === "concise") {
          conciseStream.write(buildLogString(logObj, false, false));
        } else if (type === "concise-error" && isError) {
          conciseErrorStream.write(buildLogString(logObj, false, false));
        } else if (type === "detailed") {
          detailedStream.write(chunk.toString() + "\n");
        } else if (type === "detailed-error" && isError) {
          detailedErrorStream.write(chunk.toString() + "\n");
        }
      } catch (e) {
        // Fallback for non-JSON or parsing errors
      }
      callback();
    },
  });
};

const streams = [{ stream: createStreamWriter("console") }];

if (LOG_CONFIG.ENABLE_FILE_LOGGING) {
  streams.push(
    { stream: createStreamWriter("concise") },
    { stream: createStreamWriter("concise-error"), level: "error" },
    { stream: createStreamWriter("detailed") },
    { stream: createStreamWriter("detailed-error"), level: "error" },
  );
}

const logger = pino(
  {
    level: LOG_CONFIG.LEVEL || "info",
  },
  pino.multistream(streams),
);

module.exports = logger;
