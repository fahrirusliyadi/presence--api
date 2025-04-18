import cors from 'cors';
import express, { Express } from 'express';
import { userRoutes } from './user';
import { presenceRoutes } from './presence';
import { staticRoutes } from './static';
import { classRoutes } from './class';
import { errorHandler, NotFoundError } from './error';

const app: Express = express();
const port = process.env.PORT ?? 3000;

// Middleware to enable CORS
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Presence API');
});

// Use the routes
app.use('/files', staticRoutes);
app.use('/presence', presenceRoutes);
app.use('/user', userRoutes);
app.use('/class', classRoutes);

// 404 handler for undefined routes - place this after all valid routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server`));
});

// Global error handling middleware - place this last
app.use(errorHandler);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
