const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pool = require('./database.jsx');
const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());
const uploadDir = path.join(__dirname, 'uploads');

// LoginPage API
app.post('/api/server/login', (req, res) => {
  console.log("Backend Received POST request for " + JSON.stringify(req.body));
  const username = req.body.username;
  const password = req.body.password;

  const selectSTMT = `SELECT * FROM userinfo WHERE username='${username}' AND password='${password}'`;

  pool.query(selectSTMT, (err, result) => {
    if(err) {
      res.send(JSON.stringify("fail"));
      console.log(err);
    } else {
      if(result.rows.length > 0) {
        res.send(JSON.stringify("success"));
      } else {
        res.send(JSON.stringify("fail"));
      }
    }
  });
});
app.post('/api/server/signup', (req, res) => {
  console.log("Backend Received POST request for " + JSON.stringify(req.body));
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  const insertSTMT = `INSERT INTO userinfo (email, username, password) VALUES ('${email}', '${username}', '${password}')`;

  pool.query(insertSTMT, (err, result) => {
    if(err) {
      res.send(JSON.stringify("fail"));
      console.log(err);
    } else {
      res.send(JSON.stringify("success"));
      console.log(result);
      console.log("User inserted successfully");
    }
  });
});

// ReportIssue API
app.post('/api/server/report', async (req, res) => {
  console.log("Backend Received POST request for " + JSON.stringify(req.body));
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
      console.log(err);
    } else {
      res.json(id);
      console.log(result);
      console.log("Report inserted successfully");
    }
  });
});

// MainPage API
app.get('/api/server/main', (req, res) => {
  console.log("Backend Received GET request for reports");

  const selectSTMT = `SELECT * FROM reports`;

  pool.query(selectSTMT, (err, result) => {
    if(err) {
      res.send(JSON.stringify("fail"));
      console.log(err);
    } else {
      res.send(JSON.stringify(result.rows));
      console.log(result.rows);
      console.log("Reports retrieved successfully");
    }
  });
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
  console.log("Uploading photo")
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
  console.log("Backend getting photos");
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

app.listen(port, () => {
  console.log(`Server on localhost:${port}`);
});
