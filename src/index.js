//TODO: this is basic way to import .env variable immediately but the code representation is Bad
// require("dotenv").config({ path: "./env" });

import dotenv from "dotenv";
//ADD dev script experimental feature
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

//TODO: connectDB is async awit method which return promise means we can use it as Promise

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error before app is Listening");
      throw error;
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log("connected to server at port ", process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("Error from connectDB", error);
  });

//TODO: This is basic approach
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import express from "express";
// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log(error);
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`server is listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.log(error);
//     throw error;
//   }
// })();
