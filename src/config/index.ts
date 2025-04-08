import "dotenv/config";

export default {
  db: {
    url: process.env.DB_URL ?? "mysql://root@localhost:3306/presence",
  },
  face_recognition: {
    url: process.env.FACE_RECOGNITION_URL ?? "http://127.0.0.1:5000",
  },
};
