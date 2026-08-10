"use strict";

// Express 4 doesn't forward rejected promises from async route handlers to
// the error middleware on its own — wrap every async handler with this so a
// thrown/rejected error still reaches app's error handler instead of hanging
// the request or crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
