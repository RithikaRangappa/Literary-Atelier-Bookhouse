
import axios from 'axios';

const AUTH_API = axios.create({
  baseURL: 'http://localhost:4000/api/auth',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Register a new customer
export const registerUser = (userData) =>
  AUTH_API.post('/register', userData);

// Log in
export const loginUser = (credentials) =>
  AUTH_API.post('/login', credentials);

// Log out
export const logoutUser = () =>
  AUTH_API.post('/logout');

// Check whether a user is logged in
export const getCurrentUser = () =>
  AUTH_API.get('/me');
