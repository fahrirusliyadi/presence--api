import 'dotenv/config';

export default {
  db: {
    url: process.env.DB_URL ?? 'mysql://root@localhost:3306/presence',
  },
  face_recognition: {
    url: process.env.FACE_RECOGNITION_URL ?? 'http://127.0.0.1:5000',
  },
  presence: {
    // Time settings for check-in/out (24-hour format)
    checkinTime: process.env.PRESENCE_CHECKIN_TIME ?? '07:00', // Default: 7:00 AM
    checkoutTime: process.env.PRESENCE_CHECKOUT_TIME ?? '14:30', // Default: 2:30 PM
  },
};
