
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./database');

const app = express();

// -----------------------------
// CONFIGURATION
// -----------------------------

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

const BOOKS_API_URL =
  process.env.BOOKS_API_URL || 'http://localhost:5000';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'Please configure a JWT_SECRET of at least 32 characters in .env'
  );
}

// -----------------------------
// MIDDLEWARE
// -----------------------------

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};

// -----------------------------
// AUTHENTICATION FUNCTIONS
// -----------------------------

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token', cookieOptions);

    return res.status(401).json({
      message: 'Your session has expired. Please log in again.'
    });
  }
}

// Only admins can modify books
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Admin permission required.'
    });
  }

  next();
}

// -----------------------------
// REGISTER
// -----------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please fill in all fields.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return res.status(400).json({
        message: 'Please enter your name.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    const existingUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, 'customer')
    `).run(cleanName, cleanEmail, hashedPassword);

    const user = {
      id: result.lastInsertRowid,
      name: cleanName,
      email: cleanEmail,
      role: 'customer'
    };

    const token = createToken(user);

    res.cookie('token', token, cookieOptions);

    return res.status(201).json({
      message: 'Account created successfully!',
      user
    });

  } catch (error) {
    console.error('Registration error:', error);

    return res.status(500).json({
      message: 'Something went wrong during registration.'
    });
  }
});

// -----------------------------
// LOGIN
// -----------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);

    res.cookie('token', token, cookieOptions);

    return res.json({
      message: 'Login successful!',
      user: safeUser
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Something went wrong during login.'
    });
  }
});

// -----------------------------
// CURRENT USER / SESSION
// -----------------------------

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, role
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    res.clearCookie('token', cookieOptions);

    return res.status(401).json({
      message: 'User account not found.'
    });
  }

  return res.json({ user });
});

// -----------------------------
// LOGOUT
// -----------------------------

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', cookieOptions);

  return res.json({
    message: 'Logged out successfully.'
  });
});

// -----------------------------
// BOOK API PROXY
// -----------------------------

async function forwardBookRequest(req, res, method) {
  try {
    const bookId = req.params.id
      ? `/${encodeURIComponent(req.params.id)}`
      : '';

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(
      `${BOOKS_API_URL}/books${bookId}`,
      options
    );

    const responseText = await response.text();

    res.status(response.status);

    if (responseText) {
      try {
        return res.json(JSON.parse(responseText));
      } catch {
        return res.send(responseText);
      }
    }

    return res.end();

  } catch (error) {
    console.error('Book API error:', error);

    return res.status(502).json({
      message: 'Unable to connect to the bookstore database.'
    });
  }
}

// GET: Any authenticated user can view books
app.get('/api/books', authenticateToken, (req, res) => {
  return forwardBookRequest(req, res, 'GET');
});

// POST: Admin only
app.post(
  '/api/books',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    return forwardBookRequest(req, res, 'POST');
  }
);

// PUT: Admin only
app.put(
  '/api/books/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    return forwardBookRequest(req, res, 'PUT');
  }
);

// PATCH: Admin only
app.patch(
  '/api/books/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    return forwardBookRequest(req, res, 'PATCH');
  }
);

// DELETE: Admin only
app.delete(
  '/api/books/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    return forwardBookRequest(req, res, 'DELETE');
  }
);

// -----------------------------
// SERVER HEALTH CHECK
// -----------------------------

app.get('/', (req, res) => {
  res.json({
    message: 'Bookstore authentication server is running!'
  });
});

// -----------------------------
// START SERVER
// -----------------------------

app.listen(PORT, () => {
  console.log(
    `Authentication server running at http://localhost:${PORT}`
  );
});

