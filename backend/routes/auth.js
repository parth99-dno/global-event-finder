import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide name, email, and password.'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'A user with this email is already registered.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create and save user
    const newUser = new User({
      name,
      email,
      password: passwordHash
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'success',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        interests: newUser.interests
      }
    });
  } catch (error) {
    console.error(`Signup error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide both email and password.'
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Generate token
    const token = generateToken(user);

    return res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        interests: user.interests
      }
    });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during login.'
    });
  }
});

export default router;
