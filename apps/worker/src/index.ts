import { Queue, Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const HEARTBEAT_QUEUE = "heartbeat";

const heartbeatQueue = new Queue(HEARTBEAT_QUEUE, { connection });

const worker = new Worker(
  HEARTBEAT_QUEUE,
  async () => {
    // eslint-disable-next-line no-console
    console.log(`worker heartbeat ${new Date().toISOString()}`);
  },
  { connection },
);

worker.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("worker error", err);
});

async function scheduleHeartbeat() {
  await heartbeatQueue.add(
    "tick",
    {},
    { repeat: { every: 30_000 }, removeOnComplete: true },
  );
}

scheduleHeartbeat();
