export class AppError extends Error {
  status: number;
  type: string;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    this.type = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Sumber daya tidak ditemukan') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Akses tidak diizinkan') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Akses dilarang') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validasi gagal') {
    super(message, 422);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Layanan tidak tersedia') {
    super(message, 503);
  }
}
