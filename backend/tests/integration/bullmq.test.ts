import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";

import {
  Queue,
  Worker,
  QueueEvents,
  UnrecoverableError,
} from "bullmq";

import type { Job } from "bullmq";

import { randomUUID } from "node:crypto";

// =====================================
// TEST CONFIGURATION
// =====================================

const connection = {
  host: "127.0.0.1",
  port: 6380,
  db: 0,
  maxRetriesPerRequest: null,
};

const QUEUE_NAME = `ai-testing-${randomUUID()}`;

const PREFIX = "careerlens-test";

// =====================================
// JOB TYPES
// =====================================

interface TestJobData {
  resourceId: string;
  operation: string;
  score?: number;
}

interface TestJobResult {
  success: boolean;
  resourceId: string;
  score: number;
}

// =====================================
// QUEUE AND WORKER STATE
// =====================================

let queue: Queue<TestJobData, TestJobResult>;

let worker: Worker<TestJobData, TestJobResult>;

let queueEvents: QueueEvents;

const attemptTracker = new Map<string, number>();

// =====================================
// SIMULATED AI JOB PROCESSOR
// =====================================

const processJob = async (
  job: Job<TestJobData, TestJobResult>
): Promise<TestJobResult> => {

  const jobId = job.id!;

  const attempts =
    (attemptTracker.get(jobId) ?? 0) + 1;

  attemptTracker.set(jobId, attempts);

  await job.updateProgress(10);

  // Simulate permanent failure.

  if (job.data.operation === "permanent-failure") {
    throw new UnrecoverableError(
      "Invalid background job"
    );
  }

  // Simulate temporary failure.

  if (
    job.data.operation === "temporary-failure" &&
    attempts === 1
  ) {
    throw new Error(
      "Temporary AI provider failure"
    );
  }

  // Simulate repeated failure.

  if (job.data.operation === "always-fail") {
    throw new Error(
      "Simulated processing failure"
    );
  }

  await job.updateProgress(50);

  const result: TestJobResult = {
    success: true,

    resourceId: job.data.resourceId,

    score: job.data.score ?? 85,
  };

  await job.updateProgress(100);

  return result;
};

// =====================================
// TEST LIFECYCLE
// =====================================

beforeAll(async () => {

  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Queue testing requires NODE_ENV=test"
    );
  }

  queue = new Queue<TestJobData, TestJobResult>(
    QUEUE_NAME,
    {
      connection,
      prefix: PREFIX,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "fixed",
          delay: 100,
        },

        removeOnComplete: false,
        removeOnFail: false,
      },
    }
  );

  queueEvents = new QueueEvents(
    QUEUE_NAME,
    {
      connection,
      prefix: PREFIX,
    }
  );

  await queue.waitUntilReady();

  await queueEvents.waitUntilReady();

  worker = new Worker<TestJobData, TestJobResult>(
    QUEUE_NAME,

    processJob,

    {
      connection,
      prefix: PREFIX,
      concurrency: 2,
    }
  );

  worker.on("error", (error) => {
    console.error(
      "Test worker error:",
      error.message
    );
  });

  await worker.waitUntilReady();

});

beforeEach(() => {

  attemptTracker.clear();

});

afterAll(async () => {

  try {

    await worker?.close();

    await queueEvents?.close();

    if (queue) {
      await queue.obliterate({
        force: true,
      });
    }

  } finally {

    await queue?.close();

  }

});

// =====================================
// JOB DATA HELPER
// =====================================

const createJobData = (
  operation = "success"
): TestJobData => ({
  resourceId: randomUUID(),

  operation,

  score: 85,
});

// =====================================
// BULLMQ INTEGRATION TESTS
// =====================================

describe("BullMQ Background Job Processing", () => {

  // TEST 1: QUEUE CONNECTION

  it("connects to the isolated queue", async () => {

    const client =
      await queue.waitUntilReady();

    expect(client).toBeDefined();

    expect(client.options.port).toBe(6380);

    // Execute an actual Redis-backed operation
    // through BullMQ's public queue API.

    const counts = await queue.getJobCounts(
      "waiting",
      "active"
    );

    expect(counts.waiting).toBe(0);

    expect(counts.active).toBe(0);

  });

  // TEST 2: JOB SUBMISSION

  it("successfully adds a background job", async () => {

    const job = await queue.add(
      "resume-analysis",
      createJobData()
    );

    expect(job.id).toBeDefined();

    expect(job.name).toBe(
      "resume-analysis"
    );

    const result =
      await job.waitUntilFinished(
        queueEvents,
        10000
      );

    expect(result.success).toBe(true);

  });

  // TEST 3: WORKER EXECUTION

  it("successfully processes a queued job", async () => {

    const data = createJobData();

    const job = await queue.add(
      "interview-report",
      data
    );

    const result =
      await job.waitUntilFinished(
        queueEvents,
        10000
      );

    expect(result).toEqual({
      success: true,

      resourceId: data.resourceId,

      score: 85,
    });

  });

  // TEST 4: COMPLETED JOB STATUS

  it("marks successfully processed jobs as completed", async () => {

    const job = await queue.add(
      "job-matching",
      createJobData()
    );

    await job.waitUntilFinished(
      queueEvents,
      10000
    );

    expect(await job.getState())
      .toBe("completed");

  });

  // TEST 5: JOB PROGRESS

  it("updates job progress to 100 percent", async () => {

    const job = await queue.add(
      "career-roadmap",
      createJobData()
    );

    await job.waitUntilFinished(
      queueEvents,
      10000
    );

    const savedJob =
      await queue.getJob(job.id!);

    expect(savedJob?.progress).toBe(100);

  });

  // TEST 6: JOB RESULT PERSISTENCE

  it("stores the completed job result in Redis", async () => {

    const job = await queue.add(
      "interview-report",
      createJobData()
    );

    const result =
      await job.waitUntilFinished(
        queueEvents,
        10000
      );

    const savedJob =
      await queue.getJob(job.id!);

    expect(savedJob?.returnvalue)
      .toEqual(result);

  });

  // TEST 7: DUPLICATE JOB PREVENTION

  it("prevents duplicate jobs with the same custom job ID", async () => {

    const jobId = `duplicate-${randomUUID()}`;

    const data = createJobData();

    const first = await queue.add(
      "interview-report",
      data,
      { jobId }
    );

    const second = await queue.add(
      "interview-report",
      data,
      { jobId }
    );

    expect(first.id).toBe(second.id);

    await first.waitUntilFinished(
      queueEvents,
      10000
    );

    await second.waitUntilFinished(
      queueEvents,
      10000
    );

    expect(
      attemptTracker.get(jobId)
    ).toBe(1);

  });

  // TEST 8: AUTOMATIC RETRY

  it("automatically retries temporary job failures", async () => {

    const job = await queue.add(
      "interview-report",

      createJobData("temporary-failure")
    );

    const result =
      await job.waitUntilFinished(
        queueEvents,
        10000
      );

    expect(result.success).toBe(true);

    const savedJob =
      await queue.getJob(job.id!);

    expect(savedJob?.attemptsMade).toBe(2);

    expect(
      attemptTracker.get(job.id!)
    ).toBe(2);

  });

  // TEST 9: PERMANENT FAILURE

  it("does not retry unrecoverable job failures", async () => {

    const job = await queue.add(
      "interview-report",

      createJobData("permanent-failure")
    );

    await expect(
      job.waitUntilFinished(
        queueEvents,
        10000
      )
    ).rejects.toThrow(
      "Invalid background job"
    );

    const savedJob =
      await queue.getJob(job.id!);

    expect(await savedJob?.getState())
      .toBe("failed");

    expect(savedJob?.attemptsMade)
      .toBe(1);

  });

  // TEST 10: EXHAUSTED RETRIES

  it("marks a job as failed after exhausting retry attempts", async () => {

    const job = await queue.add(
      "interview-report",

      createJobData("always-fail")
    );

    await expect(
      job.waitUntilFinished(
        queueEvents,
        10000
      )
    ).rejects.toThrow(
      "Simulated processing failure"
    );

    const savedJob =
      await queue.getJob(job.id!);

    expect(await savedJob?.getState())
      .toBe("failed");

    expect(savedJob?.attemptsMade)
      .toBe(3);

  });

  // TEST 11: MANUAL JOB RETRY

  it("supports manual retry of a failed job", async () => {

    const job = await queue.add(
      "interview-report",

      createJobData("always-fail"),

      { attempts: 1 }
    );

    await expect(
      job.waitUntilFinished(
        queueEvents,
        10000
      )
    ).rejects.toThrow();

    const failedJob =
      await queue.getJob(job.id!);

    expect(failedJob).toBeDefined();

    // Simulate recovery from the failure.

    await failedJob!.updateData({
      ...failedJob!.data,

      operation: "success",
    });

    await failedJob!.retry("failed");

    const result =
      await failedJob!.waitUntilFinished(
        queueEvents,
        10000
      );

    expect(result.success).toBe(true);

    expect(await failedJob!.getState())
      .toBe("completed");

  });

  // TEST 12: MULTIPLE JOBS

  it("processes multiple submitted jobs successfully", async () => {

    const jobs = await Promise.all(
      Array.from(
        { length: 10 },

        () =>
          queue.add(
            "interview-report",

            createJobData()
          )
      )
    );

    const results = await Promise.all(
      jobs.map(
        (job) =>
          job.waitUntilFinished(
            queueEvents,
            15000
          )
      )
    );

    expect(results).toHaveLength(10);

    expect(
      results.every(
        (result) => result.success
      )
    ).toBe(true);

  });

  // TEST 13: JOB STATISTICS

  it("provides queue processing statistics", async () => {

    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    expect(counts).toHaveProperty("waiting");

    expect(counts).toHaveProperty("active");

    expect(counts).toHaveProperty("completed");

    expect(counts).toHaveProperty("failed");

    expect(counts).toHaveProperty("delayed");

  });

  // TEST 14: NONEXISTENT JOB

  it("returns no job for an unknown job ID", async () => {

    const job = await queue.getJob(
      `unknown-${randomUUID()}`
    );

    expect(job).toBeUndefined();

  });

});