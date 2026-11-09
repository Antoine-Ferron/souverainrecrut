const { before, after, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { once } = require("node:events");
const bcrypt = require("bcrypt");

// Cette suite écrit uniquement dans la base dédiée, jamais dans la base de développement.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).pathname !== "/souverainrecrut_test") {
  throw new Error("DATABASE_URL doit cibler la base PostgreSQL souverainrecrut_test.");
}
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.NODE_ENV = "test";
process.env.API_VERSION = "v1";

const app = require("../src/app.ts").default;
const { prisma } = require("../src/config/prisma.ts");
const domain = randomUUID() + ".example.test";
const password = randomBytes(24).toString("hex");
let server, baseUrl, recruiter, recruiterToken, adminToken;

async function request(method, path, status, { token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = "Bearer " + token;
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(baseUrl + path, {
    method, headers, body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, status, method + " " + path + " : " + (result.error?.message || response.status));
  assert.equal(result.success, status < 400);
  return result;
}

async function login(email) {
  const result = await request("POST", "/auth/login", 200, { body: { email, password } });
  assert.equal(result.data.user.email, email);
  assert.equal("password" in result.data.user, false);
  assert.ok(result.data.token);
  return result.data.token;
}

before(async () => {
  const hash = await bcrypt.hash(password, 4);
  const user = { firstName: "Test", lastName: "CI", password: hash };
  recruiter = await prisma.user.create({ data: { ...user, email: "recruiter@" + domain, role: "RECRUITER" } });
  const admin = await prisma.user.create({ data: { ...user, email: "admin@" + domain, role: "ADMIN" } });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = "http://127.0.0.1:" + server.address().port + "/v1";
  recruiterToken = await login(recruiter.email);
  adminToken = await login(admin.email);
});

after(async () => {
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    const where = { email: { endsWith: "@" + domain } };
    await prisma.$transaction([
      prisma.application.deleteMany({ where: { candidate: where } }),
      prisma.job.deleteMany({ where: { recruiter: where } }),
      prisma.candidate.deleteMany({ where }),
      prisma.user.deleteMany({ where }),
    ]);
  } finally {
    await prisma.$disconnect();
  }
});

describe("API Backend et PostgreSQL", () => {
  test("le profil authentifié correspond au recruteur et masque son mot de passe", async () => {
    const { data } = await request("GET", "/auth/me", 200, { token: recruiterToken });
    assert.equal(data.id, recruiter.id);
    assert.equal(data.role, "RECRUITER");
    assert.equal("password" in data, false);
  });

  test("la connexion refuse un compte inconnu et un mauvais mot de passe", async () => {
    const unknown = await request("POST", "/auth/login", 401, {
      body: { email: "absent@" + domain, password },
    });
    const wrong = await request("POST", "/auth/login", 401, {
      body: { email: recruiter.email, password: password + "x" },
    });
    assert.equal(unknown.error.message, wrong.error.message);
  });

  test("les ressources privées refusent les visiteurs et les jetons invalides", async () => {
    for (const path of ["/auth/me", "/candidates", "/jobs", "/applications", "/users"]) {
      await request("GET", path, 401);
    }
    await request("GET", "/auth/me", 401, { token: "invalide" });
  });

  test("la liste des utilisateurs est réservée aux administrateurs", async () => {
    await request("GET", "/users", 403, { token: recruiterToken });
    const { data, pagination } = await request("GET", "/users?limit=1", 200, { token: adminToken });
    assert.equal(data.length, 1);
    assert.equal("password" in data[0], false);
    assert.equal(pagination.limit, 1);
  });

  test("un administrateur change le mot de passe sans l’exposer dans l’API ni le stocker en clair", async () => {
    const token = adminToken;
    const email = "nouveau@" + domain;
    const body = { email, firstName: "Lou", lastName: "Test", password };
    const created = await request("POST", "/users", 201, { token, body });
    const path = "/users/" + created.data.id;
    assert.equal("password" in created.data, false);
    await request("POST", "/users", 409, { token, body });
    const found = await request("GET", path, 200, { token });
    assert.equal("password" in found.data, false);
    await login(email);

    const newPassword = randomBytes(24).toString("hex");
    const updated = await request("PUT", path, 200, { token, body: { password: newPassword } });
    assert.equal("password" in updated.data, false);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email }, select: { password: true } });
    assert.notEqual(stored.password, newPassword);
    assert.ok(await bcrypt.compare(newPassword, stored.password));
    await request("POST", "/auth/login", 401, { body: { email, password } });
    await request("POST", "/auth/login", 200, { body: { email, password: newPassword } });
    const deleted = await request("DELETE", path, 200, { token });
    assert.equal("password" in deleted.data, false);
    await request("GET", path, 404, { token });
  });

  test("l’API répond et Prisma confirme la disponibilité de PostgreSQL", async () => {
    const health = await request("GET", "/health", 200);
    assert.equal(health.data.status, "UP");
    const ready = await request("GET", "/ready", 200);
    assert.equal(ready.data.status, "READY");
    assert.equal(ready.data.database, "CONNECTED");
  });

  test("un candidat peut être créé, relu, modifié et supprimé selon le rôle", async () => {
    const token = recruiterToken;
    const body = { fullName: "Camille Martin", email: "CAMILLE@" + domain };
    const created = await request("POST", "/candidates", 201, { token, body });
    const path = "/candidates/" + created.data.id;
    assert.equal(created.data.email, body.email.toLowerCase());
    await request("POST", "/candidates", 409, { token, body });
    const found = await request("GET", path, 200, { token });
    assert.equal(found.data.fullName, body.fullName);
    const updated = await request("PUT", path, 200, { token, body: { phone: "0601020304" } });
    assert.equal(updated.data.phone, "0601020304");
    await request("DELETE", path, 403, { token });
    await request("DELETE", path, 200, { token: adminToken });
    await request("GET", path, 404, { token });
  });

  function jobFixture() {
    return {
      title: "Développeur Backend", description: "Développer une API de recrutement",
      location: "Rennes", company: "Équipe CI", recruiterId: recruiter.id,
    };
  }

  test("une offre est rattachée au recruteur et sa suppression exige le rôle admin", async () => {
    const token = recruiterToken;
    const created = await request("POST", "/jobs", 201, { token, body: jobFixture() });
    const path = "/jobs/" + created.data.id;
    const found = await request("GET", path, 200, { token });
    assert.equal(found.data.recruiterId, recruiter.id);
    const updated = await request("PUT", path, 200, { token, body: { location: "Nantes" } });
    assert.equal(updated.data.location, "Nantes");
    await request("DELETE", path, 403, { token });
    await request("DELETE", path, 200, { token: adminToken });
    await request("GET", path, 404, { token });
  });

  test("la candidature relie le candidat à l’offre et conserve la décision du recruteur", async () => {
    const token = recruiterToken;
    const candidate = await prisma.candidate.create({ data: { fullName: "Alix Dupont", email: "alix@" + domain } });
    const job = await prisma.job.create({ data: jobFixture() });
    const body = { candidateId: candidate.id, jobId: job.id };
    const created = await request("POST", "/applications", 201, { token, body });
    const path = "/applications/" + created.data.id;
    assert.equal(created.data.status, "PENDING");
    assert.equal(created.data.candidate.id, candidate.id);
    assert.equal(created.data.job.id, job.id);
    await request("PUT", path, 400, { token, body: { status: "UNKNOWN" } });
    await request("PUT", path, 200, { token, body: { status: "ACCEPTED" } });
    const found = await request("GET", path, 200, { token });
    assert.equal(found.data.status, "ACCEPTED");
    for (const collection of ["candidates", "jobs", "applications"]) {
      const { data, pagination } = await request("GET", "/" + collection + "?page=1&limit=1", 200, { token });
      assert.equal(data.length, 1);
      assert.ok(pagination.total >= 1);
    }
    await request("DELETE", path, 403, { token });
    await request("DELETE", path, 200, { token: adminToken });
    await request("GET", path, 404, { token });
  });

  test("les données invalides sont refusées avant leur insertion", async () => {
    const token = recruiterToken;
    for (const [path, field] of [["/candidates", "email"], ["/jobs", "recruiterId"], ["/applications", "jobId"]]) {
      const result = await request("POST", path, 400, { token, body: {} });
      assert.ok(result.error.details.some((issue) => issue.field === field));
    }
  });
});
