import axios from "axios";
import config from "../config";
import fs from "fs";
import FormData from "form-data";

const api = axios.create({ baseURL: config.face_recognition.url });

export const updateFace = async (
  userId: number,
  image: Express.Multer.File,
) => {
  // Create a form data instance
  const formData = new FormData();

  // Create a readable stream from the uploaded file
  const fileStream = fs.createReadStream(image.path);

  // Append the file to form data
  formData.append("image", fileStream, {
    filename: image.originalname,
    contentType: image.mimetype,
  });

  const response = await api.post(`/recognize/${userId}`, formData);

  return response.data;
};
