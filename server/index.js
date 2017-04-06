"use strict";

// let server = require("./server");

// server().listen(process.env.PORT);
// console.log("Server listening on port " + process.env.PORT + "!");

const express = require("express");

const app = express();
app.use("/api/v1", require("./api/api.js"));

app.listen(process.env.PORT);
console.log(`Server listening on port ${process.env.PORT}!`);