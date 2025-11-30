/**
 * JWT Generator Utility for Photon Integration
 * 
 * NOTE: This is a DEMO implementation for development purposes only.
 * In production, JWTs should be generated and signed by a secure backend server.
 * 
 * This utility creates a simple JWT-like token structure for testing Photon integration.
 */

/**
 * Validates user data for JWT generation
 * @param {string} userId - Unique user identifier
 * @param {string} email - User email address
 * @param {string} [name] - Optional user name
 * @throws {Error} If validation fails
 */
function validateUserData(userId, email, name) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('userId is required and must be a non-empty string');
  }

  if (!email || typeof email !== 'string' || email.trim() === '') {
    throw new Error('email is required and must be a non-empty string');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('email must be a valid email address');
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    throw new Error('name must be a non-empty string if provided');
  }
}

/**
 * Base64 URL encode a string
 * @param {string} str - String to encode
 * @returns {string} Base64 URL encoded string
 */
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates a demo JWT token for Photon authentication
 * 
 * @param {string} userId - Unique user identifier
 * @param {string} email - User email address
 * @param {string} [name] - Optional user name
 * @returns {string} JWT token string
 * @throws {Error} If user data validation fails
 * 
 * @example
 * const token = generateUserJWT('user123', 'user@example.com', 'John Doe');
 */
export function generateUserJWT(userId, email, name) {
  // Validate input data
  validateUserData(userId, email, name);

  // JWT Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email: email.trim(),
    iat: now,
    exp: now + (60 * 60 * 24), // 24 hours expiration
  };

  // Add name if provided
  if (name) {
    payload.name = name.trim();
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // For demo purposes, create a simple signature
  // In production, this should use a proper signing algorithm with a secret key
  const demoSignature = base64UrlEncode(`demo-signature-${userId}-${now}`);

  // Combine to create JWT
  const jwt = `${encodedHeader}.${encodedPayload}.${demoSignature}`;

  return jwt;
}

export default {
  generateUserJWT
};
