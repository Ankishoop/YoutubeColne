import { json, response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.modal.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Apiresponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndrefreshTokens = async (userId) => {
  try {
    const existedUser = await User.findById(userId);
    console.log(
      "🚀 ~ generateAccessAndrefreshTokens ~ existedUser:",
      existedUser
    );
    const accessToken = existedUser.generateAcessToken();
    console.log(
      "🚀 ~ generateAccessAndrefreshTokens ~ accessToken:",
      accessToken
    );
    const refreshToken = existedUser.generateRefreshToken();
    console.log(
      "🚀 ~ generateAccessAndrefreshTokens ~ refreshToken:",
      refreshToken
    );

    existedUser.refreshToken = refreshToken;
    await existedUser.save({ validateBeforeSave: false });
    console.log(
      "🚀 ~ generateAccessAndrefreshTokens ~ existedUser:",
      existedUser
    );

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      " something went wrong to generate Refresh and accesstoken"
    );
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
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

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log("🚀 ~ loginUser ~ password:", password);
  console.log("🚀 ~ loginUser ~ email:", email);
  // console.log("🚀 ~ loginUser ~ username:", username);

  //TODO:

  if (!(username || email)) {
    throw new ApiError(400, "Enter username or email is required");
  }

  const isEmpty = [password].some((field) => {
    return field.trim == "";
  });
  console.log("🚀 ~ isEmpty ~ isEmpty:", isEmpty);

  if (isEmpty) {
    throw new ApiError(400, "password is required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new ApiError(404, " user not exist");
  }

  const isPasswordValid = await existedUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndrefreshTokens(
    existedUser._id
  );
  console.log(
    "🚀 ~ loginUser ~  accessToken, refreshToken:",
    accessToken,
    refreshToken
  );

  const loggedInUser = await User.findById(existedUser._id).select(
    "-password -refreshToken"
  );
  console.log("🚀 ~ loginUser ~ loggedInUser:", loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
  };

  // throw new ApiError(400, "ENTER");

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken)
    .json(
      new Apiresponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const user = req.creating_user;
  console.log("🚀 ~ logoutUser ~ user:", user);

  await User.findByIdAndUpdate(user._id, {
    $set: {
      refreshToken: undefined,
    },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken")
    .json(new Apiresponse(200, {}, "user is logged out"));
});

const refreshAccesstoken = asyncHandler(async (req, res) => {
  //TODO:
  //1. accesstoekn cookei nahi hai but refresh hai

  try {
    const inComingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    console.log(
      "🚀 ~ refreshAccesstoken ~ inComingRefreshToken:",
      inComingRefreshToken
    );

    if (!inComingRefreshToken) {
      throw new ApiError(400, "User not logged Inn");
    }

    const decodeRefreshToken = jwt.verify(
      inComingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodeRefreshToken);

    const existedUser = await User.findById(decodeRefreshToken._id);

    if (!existedUser) {
      throw new ApiError(400, "invalid credentails");
    }

    if (inComingRefreshToken !== existedUser?.refreshToken) {
      throw new ApiError(400, "invalid credentails");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndrefreshTokens(existedUser._id);
    // const generatedAccessToken = existedUser.generateAcessToken();
    // console.log(
    //   "🚀 ~ refreshAccesstoken ~ generatedAccessToken:",
    //   generatedAccessToken
    // );

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new Apiresponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "accesToken updated"
        )
      );
  } catch (error) {
    throw new ApiError(404, "something went wrong");
  }
});

const checktoken = async (req, res) => {
  const inComingaccessToken = req.cookies.accessToken;
  console.log("🚀 ~ inComingaccessToken:", inComingaccessToken);

  const decodedtoken = jwt.verify(
    inComingaccessToken,
    process.env.ACCESS_TOKEN_SECRET
  );
  console.log("🚀 ~ decodedtoken:", decodedtoken);

  const existedUser = await User.findById(decodedtoken._id);

  if (!existedUser) {
    throw new ApiError(400, "invalid credentails");
  }

  res.status(400).json(new Apiresponse(400, { inComingaccessToken }, "Add"));
};

export { registerUser, loginUser, logoutUser, refreshAccesstoken, checktoken };
