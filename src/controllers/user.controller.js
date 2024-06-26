import { json, response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.modal.js";
import {
  deleteFromCloudinary,
  extractPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import Apiresponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  //verify jwt miiidleware
  const existedUser = req.creating_user;

  const currentUser = await User.findById(existedUser?._id);

  const isValidPassword = await currentUser.isPasswordCorrect(oldPassword);
  console.log("🚀 ~ changeCurrentPassword ~ isValidPassword:", isValidPassword);

  if (!isValidPassword) {
    throw new ApiError(400, "invalid password");
  }

  currentUser.password = newPassword;
  console.log("🚀 ~ changeCurrentPassword ~ currentUser:", currentUser);

  await currentUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new Apiresponse(200, {}, "password change success"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const currentUser = req.creating_user;

  return res
    .status(200)
    .json(
      new Apiresponse(200, { currentUser }, "current User fetched Successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // TODO:
  // 1. user should be logged in  --- >  acccess token available

  const { fullName, email } = req.body;
  console.log("🚀 ~ updateAccountDetails ~ req.body:", req.body);

  if (!fullName || !email) {
    throw new ApiError(400, "all fields are required");
  }

  const newExistedUser = await User.findByIdAndUpdate(
    req.creating_user._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!newExistedUser) {
    throw new ApiError(400, "User not updated");
  }

  return res
    .status(200)
    .json(new Apiresponse(200, newExistedUser, "Account detils updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // TODO:
  // 1. Logged INN -- > verifyJWT
  //2 . multer to accept files
  //3 . cloudinary

  //req.files not used because only one file
  const avatarLocalPath = req.file?.path;
  // console.log("🚀 ~ updateUserAvatar ~ req.file:", req.file);

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar Files not found or not uploaded");
  }

  const avatarCloudinaryURL = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarCloudinaryURL?.url) {
    throw new ApiError(400, "avatar Files not upload On Cloudinary");
  }

  const previousAvatarimage = req.creating_user.avatar;
  // const path = extractPublicId(previousAvatarimage);
  const deletedImage = await deleteFromCloudinary(previousAvatarimage);
  // console.log("🚀 ~ updateUserAvatar ~ deletedImage:", deletedImage);

  const newExistedUser = await User.findByIdAndUpdate(
    req.creating_user._id,
    {
      $set: {
        avatar: avatarCloudinaryURL?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!newExistedUser) {
    throw new ApiError(400, "avatar inmage not updated");
  }

  return res
    .status(200)
    .json(new Apiresponse(200, newExistedUser, "avatar image uploaded"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // TODO:
  // 1. Logged INN -- > verifyJWT
  //2 . multer to accept files
  //3 . cloudinary

  //req.files not used because only one file
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverimage Files not found or not uploaded");
  }

  const coverImageCloudinaryURL = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImageCloudinaryURL?.url) {
    throw new ApiError(400, "coverimage Files not upload On Cloudinary");
  }

  const previouscoverImage = req.creating_user?.coverImage;
  // const path = extractPublicId(previousAvatarimage);

  if (coverImage.trim() !== "") {
    const deletedImage = await deleteFromCloudinary(previouscoverImage);
  }
  // console.log("🚀 ~ updateUserAvatar ~ deletedImage:", deletedImage);

  const newExistedUser = await User.findByIdAndUpdate(
    req.creating_user._id,
    {
      $set: {
        coverImage: coverImageCloudinaryURL?.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!newExistedUser) {
    throw new ApiError(400, "coverimage inmage not updated");
  }

  return res
    .status(200)
    .json(new Apiresponse(200, newExistedUser, "coverimage image uploaded"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // user through param

  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "provide correct channel url username");
  }

  const existedUser = await User.findOne({
    username,
  });

  if (!existedUser) {
    throw new ApiError(400, "username not exist");
  }

  // user's subscriber :
  // user's subscriber count

  //we getusers subscriber
  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "username",
        foreignField: "channel",
        as: "subs",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "username",
        foreignField: "subscriber",
        as: "substo",
      },
    },
    {
      $addFields: {
        subscount: {
          $size: "$subs",
        },
        subsTocount: {
          $sizeL: "$substo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.creating_user?.id, "$subs.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscount: 1,
        subsTocount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log("🚀 ~ getUserChannelProfile ~ channel:", channel);

  if (!channel?.length) {
    throw new ApiError(404, "channel not exist");
  }

  return res.status(200).json(new Apiresponse(200, channel[0], "channel data"));
});

const getwatchHistory = asyncHandler(async (req, res) => {
  //login check

  //aggregate monogoose available nahi hota we need to convert

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.creating_user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$owner", 0],
              },
            },
          },
          //why not here ?
          // {
          // }
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new Apiresponse(
        200,
        user[0].watchHistory,
        "watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccesstoken,
  checktoken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getwatchHistory,
};
