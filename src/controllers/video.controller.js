import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { video } from "../models/video.modal.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  //TODO:
  //verify user
  // multer get then upload on cloudinary
  // store essentials details in db
  // return res

  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const { videoFile, thumbnail } = req.files;
  console.log(
    "🚀 ~ publishAVideo ~  videoFile, thumbnail :",
    videoFile,
    thumbnail
  );

  const videoFileLocalPath = await req.files.videoFile[0].path;
  const thumbnailLocalPath = await req.files.thumbnail[0].path;

  const isEmpty = [videoFileLocalPath, thumbnailLocalPath].some((filed) => {
    return filed.trim() === "";
  });

  if (isEmpty) {
    throw new ApiError(404, "Files is not uploaded");
  }

  const videoCloudinary = await uploadOnCloudinary(videoFileLocalPath);
  console.log("🚀 ~ publishAVideo ~ videoCloudinary:", videoCloudinary);
  const thumbnaiCloudinary = await uploadOnCloudinary(thumbnailLocalPath);
  console.log("🚀 ~ publishAVideo ~ thumbnaiCloudinary:", thumbnaiCloudinary);

  if (!videoCloudinary) {
    throw new ApiError(404, "video not upload correctly");
  }
  if (!thumbnaiCloudinary) {
    throw new ApiError(404, "thumbnial not upload correctly");
  }

  const VideoDetails = await video.create({
    videoFile: videoCloudinary?.url || "",
    thumbnail: thumbnaiCloudinary?.url || "",
    title,
    description,
    views: 0,
    owner: req.creating_user._id,
    duration: videoCloudinary.duration,
  });
  console.log("🚀 ~ publishAVideo ~ VideoDetails:", VideoDetails);

  // TODO: thing to set are
  // videofile
  //thumbnail
  //owner ---> user who is uploading
  // title ,desc
  //duration
  //views -- >0
  //isPublished --> default

  res.status(200).json({
    VideoDetails,
  });
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
