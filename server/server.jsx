const express = require('express');
const cors = require('cors');
const pool = require('./database.jsx');

const app = express();

app.use(express.json());
app.use(cors());

app.get('/adduser', (req, res) => {
  //for debugging
  console.log(JSON.stringify(req.query));
  res.send("Response Received: " + JSON.stringify(req.query));
});

app.listen(4000, () => {
  console.log(`Server on localhost:4000`);
});
