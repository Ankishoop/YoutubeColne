import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const DatabaseConnect = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
      { family: 4 }
    );
    console.log("I am connecting at ", DatabaseConnect.connection.host);

    process.on;
  } catch (error) {
    console.log("MongoDB connection database error", error);
    //TODO
    process.exit(1);
  }
};

export default connectDB;
