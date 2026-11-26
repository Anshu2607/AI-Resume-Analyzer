import {
  describe,
  it,
  expect,
} from "vitest";

import express from "express";
import request from "supertest";

import {
  inputSecurity,
} from "../../src/middleware/inputSecurity.middleware.js";

// =====================================
// ISOLATED EXPRESS APPLICATION
// =====================================

const app = express();

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(inputSecurity);

app.post("/test", (req, res) => {

  res.status(200).json({
    success: true,
    data: req.body,
  });

});

app.get("/test", (req, res) => {

  res.status(200).json({
    success: true,
    data: req.query,
  });

});

// =====================================
// VALID INPUT TESTS
// =====================================

describe("Valid Request Input", () => {

  it("accepts normal JSON objects", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        name: "Test User",
        skills: ["Java", "SQL"],
      });

    expect(response.status).toBe(200);

  });

  it("accepts valid nested objects", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        profile: {
          skills: {
            backend: "Spring Boot",
          },
        },
      });

    expect(response.status).toBe(200);

  });

  it("preserves programming code in interview answers", async () => {

    const answer =
      "if (x < 10) { System.out.println(x); }";

    const response = await request(app)
      .post("/test")
      .send({ answer });

    expect(response.status).toBe(200);

    expect(response.body.data.answer)
      .toBe(answer);

  });

  it("preserves SQL queries in text fields", async () => {

    const answer =
      "SELECT * FROM users WHERE id = 1;";

    const response = await request(app)
      .post("/test")
      .send({ answer });

    expect(response.status).toBe(200);

    expect(response.body.data.answer)
      .toBe(answer);

  });

  it("preserves dollar signs inside string values", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        answer: "MongoDB supports $set and $inc",
      });

    expect(response.status).toBe(200);

  });

});

// =====================================
// NOSQL INJECTION TESTS
// =====================================

describe("NoSQL Injection Protection", () => {

  it("rejects $ne operators", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        email: {
          $ne: null,
        },
      });

    expect(response.status).toBe(400);

  });

  it("rejects $gt operators", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        score: {
          $gt: 0,
        },
      });

    expect(response.status).toBe(400);

  });

  it("rejects $where operators", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        $where: "return true",
      });

    expect(response.status).toBe(400);

  });

  it("rejects dotted property names", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        "user.role": "admin",
      });

    expect(response.status).toBe(400);

  });

  it("rejects unsafe operators in query parameters", async () => {

    const response = await request(app)
      .get("/test")
      .query({
        "$where": "return true",
      });

    expect(response.status).toBe(400);

  });

});

// =====================================
// PROTOTYPE POLLUTION TESTS
// =====================================

describe("Prototype Pollution Protection", () => {

  it("rejects __proto__ properties", async () => {

    const response = await request(app)
      .post("/test")
      .set("Content-Type", "application/json")
      .send(
        '{"__proto__":{"isAdmin":true}}'
      );

    expect(response.status).toBe(400);

  });

  it("rejects constructor properties", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        constructor: {
          prototype: {
            isAdmin: true,
          },
        },
      });

    expect(response.status).toBe(400);

  });

  it("rejects prototype properties", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        profile: {
          prototype: {
            role: "admin",
          },
        },
      });

    expect(response.status).toBe(400);

  });

});

// =====================================
// REQUEST COMPLEXITY TESTS
// =====================================

describe("Request Complexity Protection", () => {

  it("rejects excessively nested objects", async () => {

    let payload: object = {
      value: "test",
    };

    for (let i = 0; i < 20; i++) {

      payload = {
        nested: payload,
      };

    }

    const response = await request(app)
      .post("/test")
      .send(payload);

    expect(response.status).toBe(400);

  });

  it("rejects oversized arrays", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        values: Array(1001).fill("test"),
      });

    expect(response.status).toBe(400);

  });

  it("rejects excessive object properties", async () => {

    const payload = Object.fromEntries(
      Array.from(
        { length: 101 },
        (_, index) => [
          `field${index}`,
          index,
        ]
      )
    );

    const response = await request(app)
      .post("/test")
      .send(payload);

    expect(response.status).toBe(400);

  });

  it("rejects excessive total request values", async () => {

    const response = await request(app)
      .post("/test")
      .send({
        values: Array.from(
          { length: 20 },
          () => Array(600).fill("test")
        ),
      });

    expect(response.status).toBe(400);

  });

});