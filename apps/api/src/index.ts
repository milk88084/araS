import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";

const app = createApp();

async function start() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
  logger.fatal({ error }, "Failed to start server");
  process.exit(1);
});
