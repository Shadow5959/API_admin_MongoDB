class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      // 4xx errors are "fail", 5xx errors are "error"
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true; // To differentiate from programming errors
    }
  }
  
  const globalErrorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
  
    // Customize messages based on status code for common e-commerce issues
    switch (statusCode) {
      case 400:
        message = "Bad Request: Invalid data provided.";
        break;
      case 401:
        message = "Unauthorized: Invalid credentials or session expired.";
        break;
      case 403:
        message = "Forbidden: You don’t have permission to perform this action.";
        break;
      case 404:
        message = "Not Found: The requested resource does not exist.";
        break;
      case 409:
        message = "Conflict: The resource already exists.";
        break;
      case 422:
        message = "Unprocessable Entity: Validation error in request data.";
        break;
      case 500:
        message = "Internal Server Error: Something went wrong on our end.";
        break;
      case 502:
        message = "Bad Gateway: Received an invalid response from an upstream server.";
        break;
      case 503:
        message = "Service Unavailable: The server is overloaded or down for maintenance.";
        break;
      case 504:
        message = "Gateway Timeout: The request took too long to process.";
        break;
      default:
        message = err.message;
        break;
    }
  
    res.status(statusCode).json({
      status: statusCode < 500 ? "fail" : "error",
      message: message,
    });
  };
  
  module.exports = { globalErrorHandler, AppError };
  