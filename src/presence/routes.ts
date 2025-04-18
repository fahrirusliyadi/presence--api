import express, { Request, Response } from 'express';
import multer from 'multer';
import { recognizeFace } from '../user';
import { db, paginate } from '../db';
import {
  PresenceStatus,
  presenceTable,
  userTable,
  classTable,
} from '../db/schema';
import { eq, and, count } from 'drizzle-orm';
import { BadRequestError, catchAsync, NotFoundError } from '../error';
import dayjs from 'dayjs';
import config from '../config';

const router = express.Router();

// Set up multer to store files in memory without saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit file size to 5MB
  },
});

/**
 * Fetches presence records for the current day
 */
router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const currentDate = dayjs().startOf('day').format('YYYY-MM-DD');

    // Build the base query with joins
    const query = db
      .select()
      .from(presenceTable)
      .leftJoin(userTable, eq(presenceTable.userId, userTable.id))
      .where(eq(presenceTable.date, currentDate));

    // Create a count query that matches the same filter
    const countQuery = db
      .select({ total: count() })
      .from(presenceTable)
      .where(eq(presenceTable.date, currentDate));

    // Apply pagination
    const result = await paginate(req, query, countQuery);

    res.json(result);
  }),
);

/**
 * Records presence (check-in or check-out)
 */
router.post(
  '/',
  upload.single('image'),
  catchAsync(async (req: Request, res: Response) => {
    // Validate request and identify user
    const user = await validateRequestAndGetUser(req);

    const now = dayjs();
    const currentTime = now.format('HH:mm');
    const currentDate = now.startOf('day').format('YYYY-MM-DD');

    // Get existing presence record for user today (if any)
    const existingPresence = await getUserPresenceForToday(
      user.id,
      currentDate,
    );

    // Determine if this is a check-in or check-out
    const isCheckoutTime = isAfterCheckoutTime(now);

    if (!isCheckoutTime) {
      // Handle check-in
      const result = await handleCheckIn(
        user,
        existingPresence,
        currentDate,
        currentTime,
        now,
      );
      return res.status(result.status ?? 200).json({
        data: result.data,
        message: result.message,
      });
    } else {
      // Handle check-out
      const result = await handleCheckOut(
        user,
        existingPresence,
        currentTime,
        now,
      );
      return res.status(result.status ?? 200).json({
        data: result.data,
        message: result.message,
      });
    }
  }),
);

/**
 * Validates request and returns the identified user
 */
async function validateRequestAndGetUser(req: Request) {
  if (!req.file) {
    throw new BadRequestError('No image file provided');
  }

  const userId = await recognizeFace(req.file);
  const [result] = await db
    .select({
      user: userTable,
      class: classTable,
    })
    .from(userTable)
    .leftJoin(classTable, eq(userTable.classId, classTable.id))
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!result) {
    throw new NotFoundError('User not found');
  }

  // Add class data to the user object
  const user = {
    ...result.user,
    class: result.class || null,
  };

  return user;
}

/**
 * Gets the user's presence record for today (if exists)
 */
async function getUserPresenceForToday(userId: number, currentDate: string) {
  const [existingPresence] = await db
    .select()
    .from(presenceTable)
    .where(
      and(
        eq(presenceTable.userId, userId),
        eq(presenceTable.date, currentDate),
      ),
    )
    .limit(1);

  return existingPresence;
}

/**
 * Checks if current time is after checkout threshold time
 */
function isAfterCheckoutTime(now: dayjs.Dayjs): boolean {
  const [checkoutHour, checkoutMinute] = config.presence.checkoutTime
    .split(':')
    .map(Number);
  const checkoutTime = now.hour(checkoutHour).minute(checkoutMinute).second(0);
  return now.isAfter(checkoutTime);
}

/**
 * Determines if user is late based on current time
 */
function isUserLate(now: dayjs.Dayjs): boolean {
  const [checkinHour, checkinMinute] = config.presence.checkinTime
    .split(':')
    .map(Number);
  const checkinTime = now.hour(checkinHour).minute(checkinMinute).second(0);
  return now.isAfter(checkinTime);
}

/**
 * Handles the check-in process
 */
async function handleCheckIn(
  user: typeof userTable.$inferSelect & {
    class: typeof classTable.$inferSelect | null;
  },
  existingPresence: typeof presenceTable.$inferSelect | null,
  currentDate: string,
  currentTime: string,
  now: dayjs.Dayjs,
): Promise<PresenceResponse> {
  // If already checked in today, return existing record
  if (existingPresence?.checkIn) {
    return {
      data: {
        ...existingPresence,
        user,
      },
      message: 'User has already checked in today',
    };
  }

  // Create new presence record
  const newPresence = {
    userId: user.id,
    date: currentDate,
    status: isUserLate(now) ? PresenceStatus.LATE : PresenceStatus.PRESENT,
    checkIn: currentTime,
    checkOut: null,
  };

  const [{ id }] = await db
    .insert(presenceTable)
    .values(newPresence)
    .$returningId();

  const [presence] = await db
    .select()
    .from(presenceTable)
    .where(eq(presenceTable.id, id))
    .limit(1);

  return {
    data: { ...presence, user },
    message: 'Check-in successful',
    status: 200,
  };
}

/**
 * Handles the check-out process
 */
async function handleCheckOut(
  user: typeof userTable.$inferSelect & {
    class: typeof classTable.$inferSelect | null;
  },
  existingPresence: typeof presenceTable.$inferSelect | null,
  currentTime: string,
  now: dayjs.Dayjs,
): Promise<PresenceResponse> {
  // Must check in before checking out
  if (!existingPresence) {
    throw new BadRequestError('User has not checked in today');
  }

  // If already checked out today, return existing record
  if (existingPresence.checkOut) {
    return {
      data: { ...existingPresence, user },
      message: 'User has already checked out today',
    };
  }

  // Update the presence record with check-out time
  await db
    .update(presenceTable)
    .set({
      checkOut: currentTime,
      updatedAt: now.format('YYYY-MM-DD HH:mm:ss'),
    })
    .where(eq(presenceTable.id, existingPresence.id));

  const [updatedPresence] = await db
    .select()
    .from(presenceTable)
    .where(eq(presenceTable.id, existingPresence.id))
    .limit(1);

  return {
    data: { ...updatedPresence, user },
    message: 'Check-out successful',
    status: 200,
  };
}

// Helper type for response with properly typed data
interface PresenceResponse {
  data: typeof presenceTable.$inferSelect & {
    user: typeof userTable.$inferSelect & {
      class: typeof classTable.$inferSelect | null;
    };
  };
  message: string;
  status?: number;
}

export default router;
