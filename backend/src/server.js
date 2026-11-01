const app = require("./app");
const env = require("./config/env");

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const server = app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log("Allowed Origins:", env.clientUrls);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${env.port} is already in use. Another backend instance might be running.`);
  } else {
    console.error("❌ Server startup error:", err);
  }
});

module.exports = server;