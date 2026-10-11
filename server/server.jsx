const express = require('express');
const cors = require('cors');
const pool = require('./database.jsx');
const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());

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

app.listen(port, () => {
  console.log(`Server on localhost:${port}`);
});
