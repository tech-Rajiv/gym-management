/**
 * Calls one of the application's API routes from the browser.
 *
 * Always resolves - never throws - to the same shape the routes answer with,
 * so a form has one thing to handle:
 *
 *     { ok: true,  ...data }
 *     { ok: false, message, errors }
 *
 * A network failure becomes a friendly message rather than an exception, and
 * an expired session sends the browser to the login page.
 *
 * @param {string} url
 * @param {{ method?: string, body?: object }} options
 */
export async function apiRequest(url, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      ok: false,
      message: "Could not reach the server. Check your connection and try again.",
      errors: {},
    };
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 && !url.startsWith("/api/auth/")) {
    window.location.assign("/login");
  }

  if (!data) {
    return { ok: false, message: "Something went wrong. Please try again.", errors: {} };
  }
  return { errors: {}, ...data };
}

/** A form's fields as a plain object, ready to send as JSON. */
export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}
