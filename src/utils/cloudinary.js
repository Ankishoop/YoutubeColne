import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

const uploadOnCloudinary = async (localPath) => {
  try {
    if (!localPath) return null;

    const response = await cloudinary.uploader.upload(localPath, {
      resource_type: "auto",
    });
    console.log("file is uploaded", response);
    fs.unlinkSync(localPath);
    return response;
  } catch (err) {
    //remove the locallly saved uploaded file
    fs.unlinkSync(localPath);
    return null;
  }
};

const deleteFromCloudinary = async (url) => {
  try {
    const public_id = extractPublicId(url);
    const response = await cloudinary.uploader.destroy(public_id);
    // console.log("🚀 ~ deleteFromCloudinary ~ response:", response);
    return response;
  } catch (error) {
    throw error;
  }
};

const extractPublicId = (url) => {
  // Match the part of the URL after 'upload/' and before the file extension
  const regex = /\/upload\/(?:v\d+\/)?([^\.]+)\./;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// const url = "https://res.cloudinary.com/demo/image/upload/v1625647879/sample.jpg";
// const publicId = extractPublicId(url);

// console.log(publicId); // Output: sample

// xyfj4xt2tnplpkpfkrqy
export { uploadOnCloudinary, deleteFromCloudinary, extractPublicId };
