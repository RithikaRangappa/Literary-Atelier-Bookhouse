
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// GET: Fetch all books
export const getBooks = () => {
  return API.get('/books');
};

// POST: Add a new book
export const addBook = (book) => {
  return API.post('/books', book);
};

// PUT: Update an existing book
export const updateBook = (id, book) => {
  return API.put(`/books/${id}`, book);
};

// PATCH: Partially update a book
export const patchBook = (id, updates) => {
  return API.patch(`/books/${id}`, updates);
};

// DELETE: Remove a book
export const deleteBook = (id) => {
  return API.delete(`/books/${id}`);
};

export default API;

