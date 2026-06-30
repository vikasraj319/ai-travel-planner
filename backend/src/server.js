const express = require("express");
const cors = require("cors");
const env = require("./config/env"); // Update the path if needed

const app = express();

app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  })
);

app.use(express.json());

// Your routes here

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
  console.log("Allowed Origins:", env.clientUrls);
});