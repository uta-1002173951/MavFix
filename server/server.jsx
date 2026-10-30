const express = require('express');
const cors = require('cors');
const pool = require('./database.jsx');
const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());

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
      res.send(JSON.stringify("success"));
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

app.listen(port, () => {
  console.log(`Server on localhost:${port}`);
});
