const mongoose = require("mongoose");
const request = require("supertest");
const crypto = require("crypto");

process.env.JWT_SECRET = "test-clientlocker-jwt-secret-key-2026";
process.env.FRONTEND_URL = "http://localhost:5173";

const app = require("../server");
const { generateToken } = require("../utils/jwt");

const Person = require("../models/Person");
const Client = require("../models/Client");
const ClientAccess = require("../models/ClientAccess");
const ActivityLog = require("../models/ActivityLog");
const StoredFile = require("../models/File");
const DownloadLink = require("../models/DownloadLink");
const ChecklistItem = require("../models/ChecklistItem");
const ChecklistSuggestion = require("../models/ChecklistSuggestion");

jest.mock("../models/Person");
jest.mock("../models/Client");
jest.mock("../models/ClientAccess");
jest.mock("../models/ActivityLog");
jest.mock("../models/File");
jest.mock("../models/DownloadLink");
jest.mock("../models/ChecklistItem");
jest.mock("../models/ChecklistSuggestion");

const makeQuery = (resolver) => {
  const query = {
    select: jest.fn().mockImplementation(() => query),
    populate: jest.fn().mockImplementation(() => query),
    sort: jest.fn().mockImplementation(() => query),
    limit: jest.fn().mockImplementation(() => query),
    lean: jest.fn().mockImplementation(() => Promise.resolve(resolver())),
    then: (resolve, reject) => Promise.resolve(resolver()).then(resolve, reject)
  };
  return query;
};

describe("ClientLocker Access Revocation, Blocked Attempt Logging & Recovery Security", () => {
  const firmId = new mongoose.Types.ObjectId();
  const partnerId = new mongoose.Types.ObjectId();
  const traineeId = new mongoose.Types.ObjectId();
  const auditorId = new mongoose.Types.ObjectId();
  const clientUserId = new mongoose.Types.ObjectId();

  const clientAId = new mongoose.Types.ObjectId(); // Assigned to trainee initially
  const clientBId = new mongoose.Types.ObjectId(); // Unassigned to trainee
  const clientCId = new mongoose.Types.ObjectId(); // 3rd client (auditor limit test)

  const fileAId = new mongoose.Types.ObjectId();
  const fileBId = new mongoose.Types.ObjectId();
  const checklistAId = new mongoose.Types.ObjectId();
  const suggestionAId = new mongoose.Types.ObjectId();

  const partnerUser = {
    _id: partnerId,
    firm_id: firmId,
    name: "Kavitha Vel",
    email: "kavitha.partner@clientlocker.test",
    role: "partner",
    is_active: true
  };

  const traineeUser = {
    _id: traineeId,
    firm_id: firmId,
    name: "Gokul Trainee",
    email: "gokul.trainee@clientlocker.test",
    role: "staff",
    is_active: true
  };

  const auditorUser = {
    _id: auditorId,
    firm_id: firmId,
    name: "Senthil Nathan",
    email: "senthil.auditor@clientlocker.test",
    role: "auditor",
    is_active: true
  };

  const clientAUser = {
    _id: clientUserId,
    firm_id: firmId,
    name: "Ponni Agro Products",
    email: "ponni.agro.products.client@clientlocker.test",
    role: "client",
    client_id: clientAId,
    is_active: true
  };

  const peopleById = new Map([
    [String(partnerId), partnerUser],
    [String(traineeId), traineeUser],
    [String(auditorId), auditorUser],
    [String(clientUserId), clientAUser]
  ]);

  const clientsById = new Map([
    [String(clientAId), { _id: clientAId, firm_id: firmId, name: "Ponni Agro Products", created_at: new Date() }],
    [String(clientBId), { _id: clientBId, firm_id: firmId, name: "Vaigai Foods", created_at: new Date() }],
    [String(clientCId), { _id: clientCId, firm_id: firmId, name: "Kurinji Enterprises", created_at: new Date() }]
  ]);

  const filesById = new Map([
    [
      String(fileAId),
      {
        _id: fileAId,
        client_id: clientAId,
        uploaded_by: partnerId,
        name: "Bank_Statement.pdf",
        storage_path: "clientlocker/private-documents/secret-path-a",
        cloudinary_resource_type: "raw",
        file_type: "PDF",
        file_size: 12000,
        created_at: new Date()
      }
    ],
    [
      String(fileBId),
      {
        _id: fileBId,
        client_id: clientBId,
        uploaded_by: partnerId,
        name: "Vaigai_Tax_Summary.pdf",
        storage_path: "clientlocker/private-documents/secret-path-b",
        cloudinary_resource_type: "raw",
        file_type: "PDF",
        file_size: 14000,
        created_at: new Date()
      }
    ]
  ]);

  let accessStore;
  let activityStore;
  let downloadLinkStore;
  let checklistStore;
  let suggestionStore;

  let partnerToken;
  let traineeToken;
  let auditorToken;
  let clientAToken;

  beforeEach(() => {
    jest.clearAllMocks();

    accessStore = [
      {
        _id: new mongoose.Types.ObjectId(),
        person_id: traineeId,
        client_id: clientAId,
        given_by: partnerId,
        created_at: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        person_id: auditorId,
        client_id: clientAId,
        given_by: partnerId,
        created_at: new Date(Date.now() - 2000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        person_id: auditorId,
        client_id: clientBId,
        given_by: partnerId,
        created_at: new Date(Date.now() - 1000)
      },
      // Simulate a 3rd assignment in DB to verify backend 2-client auditor cap
      {
        _id: new mongoose.Types.ObjectId(),
        person_id: auditorId,
        client_id: clientCId,
        given_by: partnerId,
        created_at: new Date()
      }
    ];
    activityStore = [];
    downloadLinkStore = [];
    checklistStore = [
      {
        _id: checklistAId,
        client_id: clientAId,
        name: "March bank statement",
        done: false,
        save: jest.fn().mockResolvedValue(true)
      }
    ];
    suggestionStore = [
      {
        _id: suggestionAId,
        firm_id: firmId,
        client_id: clientAId,
        file_id: fileAId,
        suggested_item: "March bank statement",
        status: "pending",
        save: jest.fn().mockResolvedValue(true)
      }
    ];

    partnerToken = generateToken(partnerUser);
    traineeToken = generateToken(traineeUser);
    auditorToken = generateToken(auditorUser);
    clientAToken = generateToken(clientAUser);

    Person.findOne.mockImplementation((filter = {}) =>
      makeQuery(() => {
        if (filter._id) {
          const found = peopleById.get(String(filter._id));
          if (!found) return null;
          if (filter.firm_id && String(found.firm_id) !== String(filter.firm_id)) return null;
          if (filter.is_active !== undefined && found.is_active !== filter.is_active) return null;
          if (filter.role?.$in && !filter.role.$in.includes(found.role)) return null;
          return found;
        }
        return null;
      })
    );

    Person.find.mockImplementation((filter = {}) =>
      makeQuery(() =>
        [...peopleById.values()].filter((p) =>
          (!filter.firm_id || String(p.firm_id) === String(filter.firm_id))
        )
      )
    );

    Client.findOne.mockImplementation((filter = {}) =>
      makeQuery(() => {
        const client = clientsById.get(String(filter._id));
        if (!client) return null;
        if (filter.firm_id && String(client.firm_id) !== String(filter.firm_id)) return null;
        return client;
      })
    );

    Client.find.mockImplementation((filter = {}) =>
      makeQuery(() => {
        let list = [...clientsById.values()].filter(
          (c) => !filter.firm_id || String(c.firm_id) === String(filter.firm_id)
        );
        if (filter._id?.$in) {
          const allowed = new Set(filter._id.$in.map(String));
          list = list.filter((c) => allowed.has(String(c._id)));
        } else if (filter._id) {
          list = list.filter((c) => String(c._id) === String(filter._id));
        }
        return list;
      })
    );

    ClientAccess.findOne.mockImplementation((filter = {}) =>
      makeQuery(() =>
        accessStore.find(
          (a) =>
            (!filter.person_id || String(a.person_id) === String(filter.person_id)) &&
            (!filter.client_id || String(a.client_id) === String(filter.client_id))
        ) || null
      )
    );

    ClientAccess.exists.mockImplementation(async (filter = {}) => {
      const match = accessStore.find(
        (a) =>
          (!filter.person_id || String(a.person_id) === String(filter.person_id)) &&
          (!filter.client_id || String(a.client_id) === String(filter.client_id))
      );
      return match ? { _id: match._id } : null;
    });

    ClientAccess.findById.mockImplementation((id) =>
      makeQuery(() => accessStore.find((a) => String(a._id) === String(id)) || null)
    );

    ClientAccess.find.mockImplementation((filter = {}) => {
      let limitCount = Infinity;
      const populatedPaths = new Set();
      const query = {
        sort: jest.fn().mockImplementation(() => query),
        select: jest.fn().mockImplementation(() => query),
        populate: jest.fn().mockImplementation((arg) => {
          const path = typeof arg === "string" ? arg : arg?.path;
          if (path) populatedPaths.add(path);
          return query;
        }),
        limit: jest.fn().mockImplementation((n) => {
          limitCount = n;
          return query;
        }),
        lean: jest.fn().mockImplementation(() => Promise.resolve(resolve())),
        then: (res, rej) => Promise.resolve(resolve()).then(res, rej)
      };

      function resolve() {
        let rows = accessStore.filter(
          (a) =>
            (!filter.person_id || String(a.person_id) === String(filter.person_id)) &&
            (!filter.client_id || String(a.client_id) === String(filter.client_id))
        );
        rows = rows.slice(0, limitCount).map((a) => ({
          ...a,
          client_id: populatedPaths.has("client_id")
            ? clientsById.get(String(a.client_id)) || a.client_id
            : a.client_id,
          person_id: populatedPaths.has("person_id")
            ? peopleById.get(String(a.person_id)) || a.person_id
            : a.person_id
        }));
        return rows;
      }

      return query;
    });

    ClientAccess.create.mockImplementation(async (doc) => {
      const record = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        created_at: new Date()
      };
      accessStore.push(record);
      return record;
    });

    ClientAccess.deleteOne.mockImplementation(async (filter = {}) => {
      const idx = accessStore.findIndex(
        (a) =>
          (!filter._id || String(a._id) === String(filter._id)) &&
          (!filter.person_id || String(a.person_id) === String(filter.person_id)) &&
          (!filter.client_id || String(a.client_id) === String(filter.client_id))
      );
      if (idx === -1) return { deletedCount: 0 };
      accessStore.splice(idx, 1);
      return { deletedCount: 1 };
    });

    ClientAccess.findOneAndDelete.mockImplementation(async (filter = {}) => {
      const idx = accessStore.findIndex(
        (a) =>
          (!filter.person_id || String(a.person_id) === String(filter.person_id)) &&
          (!filter.client_id || String(a.client_id) === String(filter.client_id))
      );
      if (idx === -1) return null;
      const [removed] = accessStore.splice(idx, 1);
      return removed;
    });

    ClientAccess.countDocuments.mockImplementation(async (filter = {}) =>
      accessStore.filter(
        (a) => !filter.person_id || String(a.person_id) === String(filter.person_id)
      ).length
    );

    StoredFile.find.mockImplementation((filter = {}) =>
      makeQuery(() =>
        [...filesById.values()].filter(
          (f) => !filter.client_id || String(f.client_id) === String(filter.client_id)
        )
      )
    );

    StoredFile.findById.mockImplementation((id) =>
      makeQuery(() => filesById.get(String(id)) || null)
    );

    DownloadLink.create.mockImplementation(async (doc) => {
      const record = { _id: new mongoose.Types.ObjectId(), ...doc };
      downloadLinkStore.push(record);
      return record;
    });

    DownloadLink.findOne.mockImplementation((filter = {}) =>
      makeQuery(() =>
        downloadLinkStore.find((l) => l.token_hash === filter.token_hash) || null
      )
    );

    ChecklistItem.find.mockImplementation((filter = {}) =>
      makeQuery(() =>
        checklistStore.filter((i) => String(i.client_id) === String(filter.client_id))
      )
    );

    ChecklistItem.findById.mockImplementation((id) =>
      makeQuery(() => checklistStore.find((i) => String(i._id) === String(id)) || null)
    );

    ChecklistSuggestion.find.mockImplementation((filter = {}) =>
      makeQuery(() =>
        suggestionStore.filter((s) => String(s.client_id) === String(filter.client_id))
      )
    );

    ChecklistSuggestion.findOne.mockImplementation((filter = {}) =>
      makeQuery(() =>
        suggestionStore.find((s) => String(s._id) === String(filter._id)) || null
      )
    );

    ActivityLog.create.mockImplementation(async (doc) => {
      const entry = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        created_at: new Date()
      };
      activityStore.unshift(entry);
      return entry;
    });

    ActivityLog.find.mockImplementation((filter = {}) =>
      makeQuery(() => {
        let logs = [...activityStore];
        if (filter.person_id?.$in) {
          const allowed = new Set(filter.person_id.$in.map(String));
          logs = logs.filter((l) => allowed.has(String(l.person_id)));
        }
        return logs.map((l) => {
          const person = peopleById.get(String(l.person_id));
          const targetPerson = l.target_person_id
            ? peopleById.get(String(l.target_person_id))
            : null;
          const client = l.client_id ? clientsById.get(String(l.client_id)) : null;
          const file = l.file_id ? filesById.get(String(l.file_id)) : null;

          return {
            _id: l._id,
            action: l.action,
            blocked: l.blocked,
            created_at: l.created_at,
            person_id: person
              ? { _id: person._id, name: person.name, email: person.email, role: person.role }
              : null,
            target_person_id: targetPerson
              ? { _id: targetPerson._id, name: targetPerson.name, email: targetPerson.email, role: targetPerson.role }
              : null,
            client_id: client ? { _id: client._id, name: client.name, firm_id: client.firm_id } : null,
            file_id: file ? { _id: file._id, name: file.name, file_type: file.file_type, client_id: file.client_id } : null
          };
        });
      })
    );
  });

  test("Complete workflow: Trainee access -> Removal -> Blocked attempt & logging -> Recovery & preserved history", async () => {
    // 1. Before removal: Trainee sees assigned client, lists files, and generates download link
    const listBefore = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(listBefore.status).toBe(200);
    expect(listBefore.body.clients.map((c) => c.id)).toEqual([String(clientAId)]);

    const filesBefore = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(filesBefore.status).toBe(200);
    expect(filesBefore.body.files).toHaveLength(1);

    const linkBefore = await request(app)
      .post(`/api/files/${fileAId}/link`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(linkBefore.status).toBe(201);
    const preRevocationDownloadPath = linkBefore.body.downloadUrl;
    expect(preRevocationDownloadPath).toMatch(/^\/api\/links\/[a-f\d]{64}$/);

    // 2. Partner removes trainee access
    const traineeAccessRecord = accessStore.find(
      (a) => String(a.person_id) === String(traineeId) && String(a.client_id) === String(clientAId)
    );
    const removeRes = await request(app)
      .delete(`/api/access/${traineeAccessRecord._id}`)
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(removeRes.status).toBe(200);

    // Verify ACCESS_REMOVED logged with target_person_id = traineeId
    const removeLog = activityStore.find((l) => l.action === "ACCESS_REMOVED");
    expect(removeLog).toBeDefined();
    expect(String(removeLog.person_id)).toBe(String(partnerId));
    expect(String(removeLog.target_person_id)).toBe(String(traineeId));
    expect(String(removeLog.client_id)).toBe(String(clientAId));

    // 3. Stale trainee JWT immediately loses client from dashboard and is blocked across all endpoints
    const listAfter = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(listAfter.status).toBe(200);
    expect(listAfter.body.clients).toEqual([]);

    const filesAfter = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(filesAfter.status).toBe(403);

    const checklistAfter = await request(app)
      .get(`/api/clients/${clientAId}/checklist`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(checklistAfter.status).toBe(403);

    const checklistPatchAfter = await request(app)
      .patch(`/api/checklist/${checklistAId}`)
      .set("Authorization", `Bearer ${traineeToken}`)
      .send({ done: true });
    expect(checklistPatchAfter.status).toBe(403);

    const suggGetAfter = await request(app)
      .get(`/api/clients/${clientAId}/ai-checklist-suggestions`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(suggGetAfter.status).toBe(403);

    const suggPatchAfter = await request(app)
      .patch(`/api/ai-checklist-suggestions/${suggestionAId}`)
      .set("Authorization", `Bearer ${traineeToken}`)
      .send({ status: "accepted" });
    expect(suggPatchAfter.status).toBe(403);

    const linkAfter = await request(app)
      .post(`/api/files/${fileAId}/link`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(linkAfter.status).toBe(403);

    // Previously issued download link must ALSO be rejected after revocation
    const preLinkDownloadAfter = await request(app)
      .get(preRevocationDownloadPath)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(preLinkDownloadAfter.status).toBe(403);

    // 4. Verify blocked attempts were logged with user, client, action, timestamp, and zero secrets
    const blockedLogs = activityStore.filter((l) => l.blocked === true);
    expect(blockedLogs.length).toBeGreaterThanOrEqual(7);
    expect(blockedLogs.some((l) => l.action === "ACCESS_BLOCKED" && String(l.person_id) === String(traineeId) && String(l.client_id) === String(clientAId))).toBe(true);
    expect(blockedLogs.some((l) => l.action === "FILE_DOWNLOAD_BLOCKED" && String(l.person_id) === String(traineeId) && String(l.client_id) === String(clientAId) && String(l.file_id) === String(fileAId))).toBe(true);

    // Partner activity log API returns logs safely without secrets
    const activityRes = await request(app)
      .get("/api/activity")
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(activityRes.status).toBe(200);
    const serialized = JSON.stringify(activityRes.body);
    expect(serialized).not.toContain("password_hash");
    expect(serialized).not.toContain("token_hash");
    expect(serialized).not.toContain("secret-path-a");
    expect(serialized).not.toContain(traineeToken);

    // Partner still retains access after trainee removal
    const partnerFiles = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(partnerFiles.status).toBe(200);

    // 5. Partner restores trainee access
    const restoreRes = await request(app)
      .post("/api/access")
      .set("Authorization", `Bearer ${partnerToken}`)
      .send({ person_id: String(traineeId), client_id: String(clientAId) });
    expect(restoreRes.status).toBe(201);

    // 6. Trainee sees client and accesses documents again without logging out
    const listRestored = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(listRestored.status).toBe(200);
    expect(listRestored.body.clients.map((c) => c.id)).toEqual([String(clientAId)]);

    const filesRestored = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(filesRestored.status).toBe(200);

    const linkRestored = await request(app)
      .post(`/api/files/${fileAId}/link`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(linkRestored.status).toBe(201);

    // Historical blocked attempts must still exist alongside ACCESS_GRANTED
    const activityAfterRecovery = await request(app)
      .get("/api/activity")
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(activityAfterRecovery.status).toBe(200);
    const actions = activityAfterRecovery.body.activity.map((a) => a.action);
    expect(actions).toContain("ACCESS_GRANTED");
    expect(actions).toContain("ACCESS_REMOVED");
    expect(actions).toContain("ACCESS_BLOCKED");
    expect(actions).toContain("FILE_DOWNLOAD_BLOCKED");
  });

  test("Role isolation: unassigned staff, cross-client, auditor 2-client limit, and non-partner admin routes", async () => {
    // Staff cannot access unassigned client B by changing clientId
    const unassignedFiles = await request(app)
      .get(`/api/clients/${clientBId}/files`)
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(unassignedFiles.status).toBe(403);
    expect(activityStore.some((l) => l.action === "ACCESS_BLOCKED" && String(l.client_id) === String(clientBId))).toBe(true);

    // Staff cannot access activity log or assign routes
    const staffActivity = await request(app)
      .get("/api/activity")
      .set("Authorization", `Bearer ${traineeToken}`);
    expect(staffActivity.status).toBe(403);

    // Client A cannot access Client B's files, checklist, or file download link
    const clientOtherFiles = await request(app)
      .get(`/api/clients/${clientBId}/files`)
      .set("Authorization", `Bearer ${clientAToken}`);
    expect(clientOtherFiles.status).toBe(403);

    const clientOtherLink = await request(app)
      .post(`/api/files/${fileBId}/link`)
      .set("Authorization", `Bearer ${clientAToken}`);
    expect(clientOtherLink.status).toBe(403);

    // Client A can access their own files
    const clientOwnFiles = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${clientAToken}`);
    expect(clientOwnFiles.status).toBe(200);

    // Auditor can access first 2 assigned clients (A, B) but NOT 3rd client (C)
    const auditorList = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${auditorToken}`);
    expect(auditorList.status).toBe(200);
    expect(auditorList.body.clients).toHaveLength(2);

    const auditorAllowedA = await request(app)
      .get(`/api/clients/${clientAId}/files`)
      .set("Authorization", `Bearer ${auditorToken}`);
    expect(auditorAllowedA.status).toBe(200);

    const auditorBlockedC = await request(app)
      .get(`/api/clients/${clientCId}/files`)
      .set("Authorization", `Bearer ${auditorToken}`);
    expect(auditorBlockedC.status).toBe(403);
  });

  test("Legacy client assignment/removal endpoints also record ACCESS_GRANTED and ACCESS_REMOVED", async () => {
    const assignRes = await request(app)
      .post(`/api/clients/${clientBId}/assign`)
      .set("Authorization", `Bearer ${partnerToken}`)
      .send({ staff_id: String(traineeId) });
    expect(assignRes.status).toBe(201);
    expect(activityStore.some((l) => l.action === "ACCESS_GRANTED" && String(l.target_person_id) === String(traineeId) && String(l.client_id) === String(clientBId))).toBe(true);

    const removeRes = await request(app)
      .delete(`/api/clients/${clientBId}/assign/${traineeId}`)
      .set("Authorization", `Bearer ${partnerToken}`);
    expect(removeRes.status).toBe(200);
    expect(activityStore.some((l) => l.action === "ACCESS_REMOVED" && String(l.target_person_id) === String(traineeId) && String(l.client_id) === String(clientBId))).toBe(true);
  });
});
