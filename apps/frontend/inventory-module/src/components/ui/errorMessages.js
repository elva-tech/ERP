const ERROR_COPY = {
  not_configured: {
    title: "Procurement service not connected",
    message: "The procurement API endpoint is not configured for this environment yet.",
    canRetry: false,
  },
  network: {
    title: "Unable to reach the server",
    message: "Check your connection and try again.",
    canRetry: true,
  },
  unavailable: {
    title: "Service temporarily unavailable",
    message: "The procurement service did not respond. Try again shortly.",
    canRetry: true,
  },
  unauthorized: {
    title: "Session expired",
    message: "Sign in again to continue.",
    canRetry: false,
  },
  forbidden: {
    title: "Access denied",
    message: "You do not have permission to view this information.",
    canRetry: false,
  },
  not_found: {
    title: "Not found",
    message: "This record or service does not exist, or it has not been made available yet.",
    canRetry: false,
  },
  invalid_response: {
    title: "Unexpected response",
    message: "The server returned data this screen could not read.",
    canRetry: true,
  },
};

/** @param {import("../../lib/apiClient.js").ApiError | null | undefined} error */
export function describeError(error) {
  const copy = ERROR_COPY[error?.kind];
  if (copy) return copy;
  return {
    title: "Something went wrong",
    message: error?.message ?? "The request could not be completed.",
    canRetry: true,
  };
}
