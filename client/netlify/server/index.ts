// MavFix API server, ported from the original /server Express app.
// Runs as a Netlify Server; data lives in Netlify Database and photos in Netlify Blobs.
import crypto from "node:crypto";
import { promisify } from "node:util";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { getStore } from "@netlify/blobs";
import { and, asc, eq, gt, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { authSessions, reports, reportVotes, userinfo } from "../../db/schema.ts";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

const app = express();
app.set("trust proxy", true);
app.use(express.json());

const sessionCookieName = "mavfix_session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const validStatuses = ["Open", "Submitted", "Under Review", "In Progress", "Resolved"];
const photoStore = () => getStore("report-photos");

type SessionUser = { username: string; email: string; role: "staff" | "student" };
type AuthedRequest = Request & { user?: SessionUser };

function getUserRole(email: string): "staff" | "student" {
  return email.toLowerCase().endsWith("@uta.edu") ? "staff" : "student";
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

async function createSession(user: { username: string; email: string }, req: Request, res: Response) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
  await db.insert(authSessions).values({
    tokenHash: hashToken(sessionToken),
    username: user.username,
    expiresAt,
  });

  res.cookie(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.protocol === "https" || req.hostname === "localhost",
    maxAge: sessionDurationMs,
    path: "/",
  });

  return { username: user.username, role: getUserRole(user.email) };
}

function requireSession(requiredRole?: "staff" | "student") {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${sessionCookieName}=`));
    const sessionToken = cookie?.slice(sessionCookieName.length + 1);
    if (!sessionToken) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    try {
      const [row] = await db
        .select({ username: userinfo.username, email: userinfo.email })
        .from(authSessions)
        .innerJoin(userinfo, eq(userinfo.username, authSessions.username))
        .where(
          and(
            eq(authSessions.tokenHash, hashToken(decodeURIComponent(sessionToken))),
            gt(authSessions.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!row) {
        return res.status(401).json({ error: "Your session has expired. Please sign in again." });
      }

      const user: SessionUser = { ...row, role: getUserRole(row.email) };
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: "Only faculty members can update report status." });
      }
      req.user = user;
      return next();
    } catch (error) {
      console.error("Failed to validate user session", error);
      return res.status(500).json({ error: "Unable to verify your session." });
    }
  };
}

// ---------- Auth ----------

app.post("/api/server/login", async (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.username || "").trim();
  const password = req.body?.password;
  if (!identifier || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Enter your username or UTA email and password." });
  }

  try {
    const [found] = await db
      .select()
      .from(userinfo)
      .where(or(eq(userinfo.username, identifier), eq(userinfo.email, identifier.toLowerCase())))
      .limit(1);
    if (!found || !(await verifyPassword(password, found.password))) {
      return res.status(401).json({ error: "Invalid username/email or password." });
    }

    const user = await createSession(found, req, res);
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Sign in failed", error);
    return res.status(500).json({ error: "Sign in is temporarily unavailable." });
  }
});

app.post("/api/server/signup", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body?.password;
  const allowedEmail = /^[^@\s]+@(?:mavs\.uta\.edu|uta\.edu)$/i.test(email);

  if (!username || !allowedEmail || typeof password !== "string" || !password) {
    return res.status(400).json({
      error: "Use a username, password, and either a @mavs.uta.edu or @uta.edu email address.",
    });
  }

  try {
    await db.insert(userinfo).values({ email, username, password: await hashPassword(password) });
    const user = await createSession({ username, email }, req, res);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: "That username or email is already registered." });
    }
    console.error("Sign up failed", error);
    return res.status(500).json({ error: "Sign up is temporarily unavailable." });
  }
});

app.get("/api/server/session", requireSession(), (req: AuthedRequest, res) => {
  res.json({ user: { username: req.user!.username, role: req.user!.role } });
});

// ---------- Reports ----------

app.post("/api/server/report", async (req, res) => {
  const field = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const title = field(req.body?.title);
  if (!title) {
    return res.json("fail");
  }

  try {
    const [created] = await db
      .insert(reports)
      .values({
        title,
        category: field(req.body?.category),
        location: field(req.body?.location),
        description: field(req.body?.description),
        status: "Open",
      })
      .returning({ id: reports.id });
    return res.json(created.id);
  } catch (error) {
    console.error("Failed to insert report", error);
    return res.json("fail");
  }
});

app.get("/api/server/main", async (_req, res) => {
  try {
    const rows = await db.select().from(reports).orderBy(asc(reports.id));
    return res.json(rows);
  } catch (error) {
    console.error("Failed to retrieve reports", error);
    return res.status(500).json("fail");
  }
});

app.patch("/api/server/reports/:reportId/status", requireSession("staff"), async (req, res) => {
  const reportId = Number(req.params.reportId);
  const { status } = req.body ?? {};

  if (!Number.isSafeInteger(reportId) || reportId <= 0 || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "A valid report ID and status are required." });
  }

  try {
    const [report] = await db.update(reports).set({ status }).where(eq(reports.id, reportId)).returning();
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    return res.json({ report });
  } catch (error) {
    console.error("Failed to update report status", error);
    return res.status(500).json({ error: "The report status could not be updated." });
  }
});

// A browser can cast one major/minor vote per report. The (report_id, voter_id)
// primary key prevents repeated requests from incrementing the count twice.
app.post("/api/server/vote", async (req, res) => {
  const { reportId, voterId, voteType } = req.body ?? {};
  const parsedReportId = Number(reportId);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !Number.isSafeInteger(parsedReportId) || parsedReportId <= 0 ||
    typeof voterId !== "string" || !uuidPattern.test(voterId) ||
    !["major", "minor"].includes(voteType)
  ) {
    return res.status(400).json({ error: "A valid report, voter, and vote type are required." });
  }

  try {
    const [target] = await db.select({ id: reports.id }).from(reports).where(eq(reports.id, parsedReportId)).limit(1);
    if (!target) {
      return res.status(404).json({ error: "Report not found." });
    }

    const [accepted] = await db
      .insert(reportVotes)
      .values({ reportId: parsedReportId, voterId, voteType })
      .onConflictDoNothing()
      .returning({ voteType: reportVotes.voteType });
    if (!accepted) {
      const [existing] = await db
        .select({ voteType: reportVotes.voteType })
        .from(reportVotes)
        .where(and(eq(reportVotes.reportId, parsedReportId), eq(reportVotes.voterId, voterId)))
        .limit(1);
      return res.status(409).json({
        error: "You have already voted on this report.",
        voteType: existing?.voteType,
      });
    }

    const [updated] = await db
      .update(reports)
      .set(
        voteType === "major"
          ? { major: sql`${reports.major} + 1` }
          : { minor: sql`${reports.minor} + 1` },
      )
      .where(eq(reports.id, parsedReportId))
      .returning({ major: reports.major, minor: reports.minor });

    return res.status(200).json({
      reportId: parsedReportId,
      voteType,
      major: updated.major,
      minor: updated.minor,
    });
  } catch (error) {
    console.error("Failed to record report vote", error);
    return res.status(500).json({ error: "The vote could not be saved." });
  }
});

// ---------- Photos (stored in Netlify Blobs) ----------

const allowedTypes = /jpeg|jpg|png|gif/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname.split(".").pop() || "").toLowerCase();
    if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only (.jpeg, .jpg, .png, .gif) images"));
    }
  },
});

app.post("/api/server/upload", upload.single("photo"), async (req, res) => {
  const reportId = Number(req.body?.id);
  if (!req.file || !Number.isSafeInteger(reportId) || reportId <= 0) {
    return res.status(400).json({ message: "fail" });
  }

  try {
    const bytes = req.file.buffer;
    await photoStore().set(
      String(reportId),
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      { metadata: { contentType: req.file.mimetype, originalName: req.file.originalname } },
    );
    return res.status(200).json({
      message: "success",
      fileDetails: { id: String(reportId), mimetype: req.file.mimetype, size: req.file.size },
    });
  } catch (error) {
    console.error("Failed to store photo", error);
    return res.status(500).json({ message: "fail" });
  }
});

app.get("/api/server/upload", async (_req, res) => {
  try {
    const { blobs } = await photoStore().list();
    return res.json(
      blobs.map(({ key }) => ({ id: key, url: `/api/server/uploads/${encodeURIComponent(key)}` })),
    );
  } catch (error) {
    console.error("Failed to list photos", error);
    return res.status(500).json({ error: "Upload directory scan failed" });
  }
});

app.get("/api/server/uploads/:id", async (req, res) => {
  try {
    const result = await photoStore().getWithMetadata(req.params.id, { type: "arrayBuffer" });
    if (!result) {
      return res.status(404).end();
    }
    res.setHeader("Content-Type", String(result.metadata?.contentType || "application/octet-stream"));
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(Buffer.from(result.data));
  } catch (error) {
    console.error("Failed to read photo", error);
    return res.status(500).end();
  }
});

// ---------- Errors ----------

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size limit exceeded. Max is 5MB." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
  next();
});

export const config = {
  path: "/api/*",
};

export default app;
