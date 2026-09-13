const jwt = require('jsonwebtoken');

/**
 * JWT UTILITY
 *
 * Centralizes all JWT operations: sign and verify.
 * Controllers call signToken(), middleware calls verifyToken().
 * Neither needs to know the secret or algorithm — that's this module's job.
 *
 * JWT Structure (3 parts, dot-separated, base64url encoded):
 *   Header.Payload.Signature
 *
 *   Header:  { alg: "HS256", typ: "JWT" }
 *   Payload: { id: "userId", iat: 1234567890, exp: 1235172690 }
 *   Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
 *
 * Interview Q: "Is the JWT payload encrypted?"
 * A: NO. It is base64url ENCODED, not encrypted. Anyone can decode it.
 *    Never store sensitive data (passwords, card numbers) in the payload.
 *    The signature only guarantees the payload wasn't tampered with —
 *    it does NOT hide the payload.
 *
 * Interview Q: "What happens if the JWT_SECRET is compromised?"
 * A: An attacker can forge valid tokens for any userId. You must immediately
 *    rotate the secret. All existing tokens become invalid (users must re-login).
 *    In high-security systems, you'd use asymmetric keys (RS256) where the
 *    private key signs and the public key verifies.
 *
 * Interview Q: "Why HS256 and not RS256?"
 * A: HS256 (symmetric) is simpler and sufficient when the same service
 *    both signs and verifies. RS256 (asymmetric) is needed when multiple
 *    services verify tokens but only one issues them — like a microservices
 *    auth service. For a monolith, HS256 is the right choice.
 */

const signToken = (userId) => {
  return jwt.sign(
    { id: userId },                          // Payload — only store the user ID
    process.env.JWT_SECRET,                  // Secret from environment variable
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // Token expires in 7 days
  );
};

const verifyToken = (token) => {
  // jwt.verify throws if signature is invalid OR token is expired
  // The error handler catches these: JsonWebTokenError, TokenExpiredError
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
