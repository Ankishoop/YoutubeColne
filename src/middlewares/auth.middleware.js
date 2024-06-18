import { User } from "../models/user.modal.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("🚀 ~ verifyJWT ~ token:", token);

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("🚀 ~ verifyJWT ~ decodedToken:", decodedToken);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    console.log("🚀 ~ verifyJWT ~ user:", user);

    if (!user) {
      throw new ApiError(401, "unauthorized accessToken ");
    }

    req.creating_user = user;
    next();
  } catch (err) {
    throw new ApiError(401, err?.message || "invalid token");
  }
};
