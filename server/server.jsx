const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./database.jsx');
const port = 4000;
const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
const uploadDir = path.join(__dirname, 'uploads');

const sessionCookieName = 'mavfix_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function getUserRole(email) {
  return email.toLowerCase().endsWith('@uta.edu') ? 'staff' : 'student';
}

async function createSession(user, res) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  await pool.query(
    'INSERT INTO auth_sessions (token_hash, username, expires_at) VALUES ($1, $2, $3)',
    [tokenHash, user.username, expiresAt]
  );
  res.cookie(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionDurationMs,
    path: '/'
  });

  return {
    username: user.username,
    role: getUserRole(user.email)
  };
}

function requireSession(requiredRole) {
  return async (req, res, next) => {
    const cookie = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${sessionCookieName}=`));
    const sessionToken = cookie?.slice(sessionCookieName.length + 1);
    if (!sessionToken) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(decodeURIComponent(sessionToken)).digest('hex');
      const result = await pool.query(
        `SELECT users.username, users.email
         FROM auth_sessions AS sessions
         JOIN userinfo AS users ON users.username = sessions.username
         WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      }

      user.role = getUserRole(user.email);
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: 'Only faculty members can update report status.' });
      }
      req.user = user;
      return next();
    } catch (error) {
      console.error('Failed to validate user session', error);
      return res.status(500).json({ error: 'Unable to verify your session.' });
    }
  };
}

app.post('/api/server/login', async (req, res) => {
  const identifier = String(req.body.identifier || req.body.username || '').trim();
  const password = req.body.password;
  if (!identifier || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your username or UTA email and password.' });
  }

  try {
    const result = await pool.query(
      `SELECT username, email FROM userinfo
       WHERE (username = $1 OR LOWER(email) = LOWER($1)) AND password = $2
       LIMIT 1`,
      [identifier, password]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const user = await createSession(result.rows[0], res);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Sign in failed', error);
    return res.status(500).json({ error: 'Sign in is temporarily unavailable.' });
  }
});

app.post('/api/server/signup', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  const allowedEmail = /^[^@\s]+@(?:mavs\.uta\.edu|uta\.edu)$/i.test(email);

  if (!username || !allowedEmail || typeof password !== 'string' || !password) {
    return res.status(400).json({
      error: 'Use a username, password, and either a @mavs.uta.edu or @uta.edu email address.'
    });
  }

  try {
    await pool.query(
      'INSERT INTO userinfo (email, username, password) VALUES ($1, $2, $3)',
      [email, username, password]
    );
    const user = await createSession({ username, email }, res);
    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That username or email is already registered.' });
    }
    console.error('Sign up failed', error);
    return res.status(500).json({ error: 'Sign up is temporarily unavailable.' });
  }
});

app.get('/api/server/session', requireSession(), (req, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

// ReportIssue API
app.post('/api/server/report', async (req, res) => {
  const title = req.body.title;
  const category = req.body.category;
  const location = req.body.location;
  const description = req.body.description;
  const status = "Open";
  const major = 0;
  const minor = 0;

  const selectSTMT = `SELECT MAX(id) AS max FROM reports`;
  const result = await pool.query(selectSTMT);
  const id = result.rows[0].max + 1;

  const insertSTMT = `INSERT INTO reports (title, category, location, description, status, major, minor, id) VALUES ('${title}', '${category}', '${location}', '${description}', '${status}', ${major}, ${minor}, ${id})`;

  pool.query(insertSTMT, (err, result) => {
    if(err) {
      res.send(JSON.stringify("fail"));
      console.error('Failed to insert report', err);
    } else {
      res.json(id);
    }
  });
});

// MainPage API
app.get('/api/server/main', (req, res) => {
  const selectSTMT = `SELECT * FROM reports`;

  pool.query(selectSTMT, (err, result) => {
    if(err) {
      res.send(JSON.stringify("fail"));
      console.error('Failed to retrieve reports', err);
    } else {
      res.send(JSON.stringify(result.rows));
    }
  });
});

app.patch('/api/server/reports/:reportId/status', requireSession('staff'), async (req, res) => {
  const reportId = Number(req.params.reportId);
  const { status } = req.body;
  const validStatuses = ['Open', 'Submitted', 'Under Review', 'In Progress', 'Resolved'];

  if (!Number.isSafeInteger(reportId) || reportId <= 0 || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'A valid report ID and status are required.' });
  }

  try {
    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, reportId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    return res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Failed to update report status', error);
    return res.status(500).json({ error: 'The report status could not be updated.' });
  }
});

// A browser can cast one major/minor vote per report. The unique key is
// enforced by PostgreSQL so repeated requests cannot increment the count twice.
app.post('/api/server/vote', async (req, res) => {
  const { reportId, voterId, voteType } = req.body;
  const parsedReportId = Number(reportId);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!Number.isSafeInteger(parsedReportId) || parsedReportId <= 0 ||
      typeof voterId !== 'string' || !uuidPattern.test(voterId) ||
      !['major', 'minor'].includes(voteType)) {
    return res.status(400).json({ error: 'A valid report, voter, and vote type are required.' });
  }

  const voteQuery = `
    WITH target_report AS MATERIALIZED (
      SELECT id FROM reports WHERE id = $1
    ),
    new_vote AS (
      INSERT INTO report_votes (report_id, voter_id, vote_type)
      SELECT id, $2::uuid, $3 FROM target_report
      ON CONFLICT (report_id, voter_id) DO NOTHING
      RETURNING report_id, vote_type
    ),
    updated_report AS (
      UPDATE reports AS report
      SET major = COALESCE(report.major, 0) +
            CASE WHEN new_vote.vote_type = 'major' THEN 1 ELSE 0 END,
          minor = COALESCE(report.minor, 0) +
            CASE WHEN new_vote.vote_type = 'minor' THEN 1 ELSE 0 END
      FROM new_vote
      WHERE report.id = new_vote.report_id
      RETURNING report.major, report.minor
    )
    SELECT
      (SELECT id FROM target_report) AS report_id,
      (SELECT vote_type FROM new_vote) AS accepted_vote,
      (SELECT major FROM updated_report) AS major,
      (SELECT minor FROM updated_report) AS minor
  `;

  try {
    const result = await pool.query(voteQuery, [parsedReportId, voterId, voteType]);
    const vote = result.rows[0];
    if (!vote.report_id) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    if (!vote.accepted_vote) {
      return res.status(409).json({ error: 'You have already voted on this report.' });
    }
    return res.status(200).json({
      reportId: vote.report_id,
      voteType: vote.accepted_vote,
      major: vote.major,
      minor: vote.minor,
    });
  } catch (error) {
    console.error('Failed to record report vote', error);
    return res.status(500).json({ error: 'The vote could not be saved.' });
  }
});

// photo uploading
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const id = req.body.id;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, id + fileExtension)
  }
});
// file filtering
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Only (.jpeg, .jpg, .png, .gif) images'), false);
  }
};
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit size to 5MB
  fileFilter: fileFilter
});
app.use('/uploads', express.static(uploadDir));
// api for photo upload
app.post('/api/server/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'fail' });
  }
  res.status(200).json({
    message: 'success',
    fileDetails: req.file
  });
});
// api for getting uploaded photos
app.get('/api/server/upload', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if(err) {
      return res.status(500).json({ error: "Upload directory scan failed"})
    }
    const photoUrls = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => ({
        id: path.parse(file).name,
        url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(file)}`
      }));
    res.status(200).json(photoUrls);
  });
});
// error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size limit exceeded. Max is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

Promise.all([
  pool.query(`
    CREATE TABLE IF NOT EXISTS report_votes (
      report_id INTEGER NOT NULL,
      voter_id UUID NOT NULL,
      vote_type TEXT NOT NULL CHECK (vote_type IN ('major', 'minor')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (report_id, voter_id)
    )
  `),
  pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
]).then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch((error) => {
  console.error('Failed to initialize server tables', error);
  process.exit(1);
});
