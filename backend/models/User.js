const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * USER MODEL
 *
 * Represents a registered trader on the platform.
 *
 * Key design decisions:
 *
 * 1. PASSWORD HASHING IN MODEL (pre-save hook)
 *    We hash the password in a Mongoose pre-save hook, not in the controller.
 *    Why? Because if any other part of the codebase saves a User document
 *    (e.g., an admin script), hashing still happens automatically. You never
 *    accidentally store plaintext. The controller stays clean.
 *
 * 2. cashBalance DEFAULT = 1,000,000 (₹10 lakh)
 *    This is a paper-trading platform. Users start with simulated money.
 *    ₹10,00,000 is a realistic starting amount for paper trading.
 *
 * 3. PASSWORD SELECT: false
 *    By default, whenever you query a User, the password field is NOT
 *    returned. This prevents accidentally sending password hashes to the
 *    frontend. To explicitly include it (e.g., during login), use:
 *    User.findOne({ email }).select('+password')
 *
 * 4. comparePassword() instance method
 *    We attach the comparison logic to the model itself. The controller
 *    calls user.comparePassword(plaintext) — it doesn't need to know
 *    bcrypt exists. This is the Single Responsibility Principle.
 *
 * Interview Q: "Why not hash the password in the controller?"
 * A: Separation of concerns. The model owns password-related logic.
 *    A controller should be responsible for HTTP handling, not crypto.
 *    Also, pre-save hooks guarantee hashing regardless of which code
 *    path saves the user.
 *
 * Interview Q: "What is bcrypt salt rounds?"
 * A: bcrypt generates a random salt and hashes the password N times (2^N
 *    iterations). More rounds = slower computation = harder to brute force.
 *    10 rounds is the industry standard: takes ~100ms on modern hardware —
 *    negligible for users, very expensive for attackers running millions of
 *    attempts.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         cashBalance:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                        // Creates a unique index in MongoDB
      lowercase: true,                     // Normalize before saving
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries by default
    },

    // Starting paper-trading balance in INR
    // Default: ₹10,00,000 (10 lakh) — a realistic paper trading amount
    cashBalance: {
      type: Number,
      default: Number(process.env.INITIAL_CASH_BALANCE) || 1000000,
      min: [0, 'Cash balance cannot be negative'],
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email unique index is created by `unique: true` above.
// No additional indexes needed — user lookups are almost always by email or _id.

// ─── Pre-Save Hook: Hash Password ─────────────────────────────────────────────
/**
 * This runs before every save() call.
 * The `isModified('password')` check is critical:
 * Without it, every time a user updates their name or balance,
 * the already-hashed password would be hashed AGAIN, making it
 * impossible to log in.
 */
userSchema.pre('save', async function (next) {
  // `this` refers to the User document being saved
  if (!this.isModified('password')) return next();

  // Salt rounds: 12 is a good production value (slightly higher than 10)
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
/**
 * candidatePassword: plaintext string from login form
 * this.password: hashed string from database
 *
 * bcrypt.compare() hashes the candidate with the same salt embedded
 * in the stored hash and compares. We never decrypt the stored hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Safe User Object ───────────────────────────────────────
/**
 * Returns a plain object without sensitive fields.
 * Use this when sending user data to the frontend.
 */
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    cashBalance: this.cashBalance,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
