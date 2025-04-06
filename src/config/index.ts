import "dotenv/config";

export default {
  db: {
    url: process.env.DATABASE_URL!,
  },
};
