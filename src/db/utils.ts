import { Request } from 'express';

/**
 * Interface for pagination result
 */
export interface PaginationResult<T> {
  data: T[];
  page: number;
  lastPage: number;
}

/**
 * Applies pagination to an existing query
 *
 * @param req Express request object to extract pagination parameters
 * @param query The base query to apply pagination to
 * @param countQuery The query to use for counting total records
 * @returns Paginated result with metadata
 */
export async function paginate<T extends Record<string, unknown>>(
  req: Request,
  // Use any for the query types to avoid TypeScript errors with Drizzle's complex return types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countQuery: any,
): Promise<PaginationResult<T>> {
  // Get pagination parameters from query string
  const page = parseInt((req.query.page as string) || '1');
  const limit = parseInt((req.query.limit as string) || '10');

  // Calculate offset
  const offset = (page - 1) * limit;

  // Execute query with pagination
  const data = (await query.limit(limit).offset(offset)) as T[];

  // Execute the provided count query
  const [{ total }] = await countQuery;

  const lastPage = Math.ceil(total / limit);

  return {
    data,
    page,
    lastPage,
  };
}
