export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    code = "APPLICATION_ERROR",
    details?: unknown,
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 400, true, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, true, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You are not allowed to perform this action") {
    super(message, 403, true, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, true, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409, true, "CONFLICT");
  }
}

export class EmailDeliveryError extends AppError {
  constructor() {
    super("Email delivery failed", 502, true, "EMAIL_DELIVERY_FAILED");
  }
}

export class UploadUnavailableError extends AppError {
  constructor() {
    super("File uploads are not enabled", 503, true, "UPLOAD_UNAVAILABLE");
  }
}

export class StorageProviderError extends AppError {
  constructor() {
    super("File storage failed", 502, true, "STORAGE_PROVIDER_ERROR");
  }
}
