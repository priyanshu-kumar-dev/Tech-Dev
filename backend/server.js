
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Tech_Dev Backend Running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
