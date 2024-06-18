import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is Required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  console.log("PASS1");
  if (!this.isModified("password")) return next();
  console.log("PASS1");
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  // console.log("🚀 ~ password:", password);
  // console.log("🚀 ~ this.password:", this.password);

  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAcessToken = function () {
  // console.log("🚀 ~ this._id:", this._id);

  // console.log(
  //   "🚀 ~ process.env.ACCESS_TOKEN_SECRET:",
  //   process.env.ACCESS_TOKEN_SECRET
  // );

  // console.log(
  //   "🚀 ~    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,:",
  //   process.env.ACCESS_TOKEN_EXPIRY
  // );

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,

    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      // expiresIn: "120s",
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
