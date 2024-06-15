import { json, response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Apiresponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({
  //   message: "ok",
  // });
  //TODO:
  //1: get user details
  //2: Validation - not empty
  //3: check if user already exist --userNAme and emai;
  //4: check for images . check for avatar
  //5: upload then to cloudinary
  //6: create user object -- encrypt password//create entry in db
  //7: remove password and refresh token field
  //8: check for user creation
  //return res

  const { fullName, email, username, password } = req.body;

  const isEmpty = [fullName, email, username, password].some((field) => {
    return field.trim() === "";
  });

  if (isEmpty) {
    throw new ApiError(400, "All field is required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User Already Exist can't be registererd");
  }
  console.log("🚀 ~ registerUser ~ req.files:", req.files);

  const avatarLocalPath = await req.files?.avatar[0]?.path;
  // console.log("🚀 ~ registerUser ~ avatarLocalPath:", avatarLocalPath);
  let coverImageLocalPath;

  // console.log("🚀 ~ isArray", Array.isArray(req.files?.coverImage));
  console.log(req.files?.coverImage?.length);

  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files?.coverImage.length > 0
  ) {
    coverImageLocalPath = await req.files?.coverImage[0].path;
  }
  // console.log("🚀 ~ registerUser ~ coverImageLocalPath:", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar is required");
  }

  const avatarCloudinaryURL = await uploadOnCloudinary(avatarLocalPath);
  // console.log("🚀 ~ registerUser ~ avatarCloudinaryURL:", avatarCloudinaryURL);
  const coverImageCloudinaryURL = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarCloudinaryURL) {
    throw new ApiError(400, "avatar is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatarCloudinaryURL.url,
    coverImage: coverImageCloudinaryURL?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  // new Apiresponse(200, createdUser, "user is created");

  res
    .status(200)
    .json(new Apiresponse(200, createdUser, "User registered Sucessfully"));
});

export { registerUser };
