import { useEffect, useMemo, useState } from 'react';

import {
  getBooks,
  addBook,
  updateBook,
  deleteBook
} from './services/api';

import {
  getCurrentUser,
  logoutUser
} from './services/auth';

import AuthPage from './components/AuthPage';
import LandingPage from './components/Landingpage';
import atelierLogo from './assets/literary-atelier-logo.png';

import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Modal,
  Alert,
  Badge,
  Spinner,
  Table,
  ButtonGroup
} from 'react-bootstrap';

import {
  FaBook,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaThLarge,
  FaList,
  FaTimes,
  FaSignOutAlt,
  FaUserCircle
} from 'react-icons/fa';

import './App.css';

// Find a book cover using Open Library; no image URL needs to be entered manually.
async function findBookCover(title, author) {
  const params = new URLSearchParams({
    title: title.trim(),
    author: author.trim(),
    limit: '10',
    fields: 'title,author_name,cover_i'
  });

  const response = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!response.ok) throw new Error('Book cover search is unavailable.');

  const data = await response.json();
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedAuthor = author.trim().toLowerCase();
  const matches = (data.docs || []).filter((book) => book.cover_i);

  const bestMatch =
    matches.find((book) => (book.title || '').toLowerCase() === normalizedTitle &&
      (book.author_name || []).some((name) => name.toLowerCase().includes(normalizedAuthor))) ||
    matches.find((book) => (book.title || '').toLowerCase() === normalizedTitle) ||
    matches[0];

  return bestMatch?.cover_i
    ? `https://covers.openlibrary.org/b/id/${bestMatch.cover_i}-L.jpg`
    : '';
}

// -----------------------------
// EMPTY BOOK FORM
// -----------------------------

const emptyForm = {
  title: '',
  author: '',
  price: '',
  category: '',
  description: '',
  availability: 'Available',
  image: ''
};

// ======================================================
// MAIN APPLICATION
// ======================================================


function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Check whether a user already has an active session
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((response) => {
        if (active) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setShowAuth(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setShowAuth(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="secondary" />
      </div>
    );
  }

  // Authenticated users see their role-specific dashboard
  if (user) {
    return (
      <BookDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // Visitors see the login page only after clicking Sign In
  if (showAuth) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  // Default public homepage
  return (
    <LandingPage
      onSignIn={() => setShowAuth(true)}
    />
  );
}


// ======================================================
// BOOKSTORE DASHBOARD
// ======================================================

function BookDashboard({ user, onLogout }) {

  const isAdmin = user.role === 'admin';

  // -----------------------------
  // STATE MANAGEMENT
  // -----------------------------

  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');

  const [viewMode, setViewMode] = useState('cards');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // -----------------------------
  // GET: FETCH BOOKS
  // -----------------------------

  const fetchBooks = async () => {
    try {
      setLoading(true);

      const response = await getBooks();

      setBooks(response.data);
      setError('');

    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Unable to load books. Please check the backend servers.');
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // -----------------------------
  // DASHBOARD STATISTICS
  // -----------------------------

  const availableBooks = books.filter(
    (book) => book.availability === 'Available'
  ).length;

  const outOfStockBooks = books.filter(
    (book) => book.availability === 'Out of Stock'
  ).length;

  const categories = [
    ...new Set(books.map((book) => book.category).filter(Boolean))
  ];

  // -----------------------------
  // SEARCH AND FILTER
  // -----------------------------

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const searchText =
        `${book.title} ${book.author} ${book.category}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'All' ||
        book.category === categoryFilter;

      const matchesAvailability =
        availabilityFilter === 'All' ||
        book.availability === availabilityFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [books, search, categoryFilter, availabilityFilter]);

  // -----------------------------
  // FORM HANDLING
  // -----------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'title' || name === 'author' ? { image: '' } : {})
    }));
    if (name === 'title' || name === 'author') setCoverMessage('');
  };

  // Automatically search for a cover after the title and author have been entered.
  useEffect(() => {
    const title = formData.title.trim();
    const author = formData.author.trim();

    if (!showModal || !title || !author || formData.image) return undefined;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setCoverLoading(true);
      setCoverMessage('Searching for the book cover...');
      try {
        const image = await findBookCover(title, author);
        if (cancelled) return;

        if (image) {
          setFormData((previous) => {
            if (
              previous.title.trim() !== title ||
              previous.author.trim() !== author ||
              previous.image
            ) return previous;
            return { ...previous, image };
          });
          setCoverMessage('Cover found automatically.');
        } else {
          setCoverMessage('No cover found. You can enter an image URL below.');
        }
      } catch {
        if (!cancelled) setCoverMessage('Cover search failed. You can enter an image URL below.');
      } finally {
        if (!cancelled) setCoverLoading(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [formData.title, formData.author, formData.image, showModal]);

  // Open Add Book Modal
  const handleAdd = () => {
    if (!isAdmin) return;

    setEditingId(null);
    setFormData(emptyForm);
    setError('');
    setShowModal(true);
  };

  // Open Edit Book Modal
  const handleEdit = (book) => {
    if (!isAdmin) return;

    setEditingId(book.id);

    setFormData({
      ...book,
      price: String(book.price)
    });

    setError('');
    setShowModal(true);
  };

  // Close Modal
  const handleClose = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError('');
  };

  // -----------------------------
  // POST AND PUT: SAVE BOOK
  // -----------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) return;

    const {
      title,
      author,
      price,
      category,
      description,
      image
    } = formData;

    if (
      !title.trim() ||
      !author.trim() ||
      !price ||
      !category ||
      !description.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      setError('Price must be greater than zero.');
      return;
    }

    if (image.trim()) {
      try {
        const imageURL = new URL(image.trim());
        if (imageURL.protocol !== 'https:' && imageURL.protocol !== 'http:') {
          throw new Error('Invalid URL');
        }
      } catch {
        setError('Please enter a valid HTTP or HTTPS image URL.');
        return;
      }
    }

    const bookData = {
      title: title.trim(),
      author: author.trim(),
      price: Number(price),
      category,
      description: description.trim(),
      availability: formData.availability,
      image: image.trim()
    };

    try {
      setSaving(true);
      setError('');

      if (editingId !== null) {
        await updateBook(editingId, {
          ...bookData,
          id: editingId
        });

        setMessage('Book updated successfully!');

      } else {
        await addBook(bookData);

        setMessage('New book added successfully!');
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(emptyForm);

      await fetchBooks();

    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to modify books.');
      } else {
        setError('Unable to save book. Please try again.');
      }

    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // DELETE: REMOVE BOOK
  // -----------------------------

  const handleDelete = async (id) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this book?'
    );

    if (!confirmed) return;

    try {
      await deleteBook(id);

      setMessage('Book deleted successfully!');

      await fetchBooks();

    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to delete books.');
      } else {
        setError('Unable to delete book. Please try again.');
      }
    }
  };

  // -----------------------------
  // CLEAR SEARCH AND FILTERS
  // -----------------------------

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setAvailabilityFilter('All');
  };

  // -----------------------------
  // MAIN USER INTERFACE
  // -----------------------------

  const BookCard = ({ book }) => (
    <article className="atelier-book">
      <div className="atelier-book-cover-wrap">
        <img
          src={book.image || 'https://placehold.co/300x420?text=Book+Cover'}
          alt={book.title}
          className="atelier-book-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://placehold.co/300x420?text=Book+Cover';
          }}
        />
      </div>

      <div className="atelier-book-info">
        <div className="atelier-book-heading">
          <div>
            <h3>{book.title}</h3>
            <p className="atelier-book-author">{book.author}</p>
            <p className="atelier-book-category">{book.category}</p>
          </div>
          <span className={`atelier-availability ${book.availability === 'Available' ? 'is-available' : 'is-unavailable'}`}>
            {book.availability}
          </span>
        </div>

        {book.description && (
          <p className="atelier-book-description">{book.description}</p>
        )}

        <div className="atelier-book-bottom">
          <strong className="atelier-book-price">
            ₹{Number(book.price).toFixed(0)}
          </strong>

          {isAdmin && (
            <div className="atelier-book-actions">
              <Button
                className="atelier-icon-button"
                onClick={() => handleEdit(book)}
                aria-label={`Edit ${book.title}`}
                title="Edit book"
              >
                <FaEdit />
              </Button>
              <Button
                className="atelier-icon-button delete"
                onClick={() => handleDelete(book.id)}
                aria-label={`Delete ${book.title}`}
                title="Delete book"
              >
                <FaTrash />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="atelier-catalogue">
      <header className="atelier-catalogue-header">
        <div className="atelier-header-top">
          <a
            className="atelier-wordmark"
            href="#catalogue"
            aria-label="The Literary Atelier home"
          >
            <img
              src={atelierLogo}
              alt="The Literary Atelier logo"
              className="atelier-header-logo"
            />
            <span className="atelier-wordmark-copy">
              <strong>THE LITERARY ATELIER</strong>
              <em>A CURATED BOOKHOUSE</em>
            </span>
          </a>

          <div className="atelier-header-right">
            <nav className="atelier-utility-nav" aria-label="Utility navigation">
              <a href="#catalogue">NEWS</a>
              <a href="#about-collection">ABOUT US</a>
              <a href="#catalogue-footer">CONTACT</a>
            </nav>
            <div className="atelier-account">
              <span><FaUserCircle /> {user.name}</span>
              <button onClick={onLogout} aria-label="Log out" title="Log out">
                <FaSignOutAlt />
                <span>LOG OUT</span>
              </button>
            </div>
          </div>
        </div>

        <nav className="atelier-main-nav" aria-label="Main navigation">
          <a className="active" href="#catalogue">COLLECTIONS</a>
          <a href="#catalogue">CATALOGUE</a>
          <a href="#filters">CATEGORIES</a>
          {isAdmin ? (
            <a href="#admin-tools">INVENTORY</a>
          ) : (
            <a href="#catalogue">MY COLLECTION</a>
          )}
        </nav>
      </header>

      <Container fluid className="atelier-catalogue-shell" id="catalogue">
        <aside className="atelier-filter-panel" id="filters">
          <h2>Browse the Collection</h2>

          <div className="atelier-filter-group">
            <label htmlFor="category-filter">CATEGORY</label>
            <Form.Select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Form.Select>
          </div>

          <div className="atelier-filter-group">
            <label htmlFor="availability-filter">AVAILABILITY</label>
            <Form.Select
              id="availability-filter"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="All">All Availability</option>
              <option value="Available">Available</option>
              <option value="Out of Stock">Out of Stock</option>
            </Form.Select>
          </div>

          <Button className="atelier-search-button" onClick={() => setSearch(search.trim())}>
            Search <span>→</span>
          </Button>

          <div className="atelier-quick-search">
            <h3>Quick Search</h3>
            <div className="atelier-search-field">
              <Form.Control
                aria-label="Search by title, author or keyword"
                placeholder="Search by title, author or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FaSearch />
            </div>
          </div>

          <p className="atelier-filter-note">
            Explore our curated collection of books across diverse genres.
          </p>

          {isAdmin && (
            <div className="atelier-admin-tools" id="admin-tools">
              <span>ADMINISTRATOR</span>
              <Button className="atelier-search-button" onClick={handleAdd}>
                <FaPlus /> Add a Book
              </Button>
              <div className="atelier-admin-counts">
                <span>{books.length} titles</span>
                <span>{availableBooks} available</span>
                <span>{outOfStockBooks} out of stock</span>
              </div>
            </div>
          )}
        </aside>

        <main className="atelier-catalogue-main">
          <div className="atelier-catalogue-heading">
            <div>
              <p className="atelier-kicker">
                THE LITERARY ATELIER / {isAdmin ? 'INVENTORY' : 'COLLECTION'}
              </p>
              <h1>{isAdmin ? 'Manage the Collection' : 'The Collection'}</h1>
              <p>
                {isAdmin
                  ? 'Curate your catalogue and keep your collection up to date.'
                  : 'Discover and browse books from our curated catalogue.'}
              </p>
            </div>

            <ButtonGroup className="atelier-view-toggle" aria-label="Catalogue display">
              <Button
                className={viewMode === 'cards' ? 'selected' : ''}
                onClick={() => setViewMode('cards')}
              >
                <FaThLarge /> Cards
              </Button>
              <Button
                className={viewMode === 'table' ? 'selected' : ''}
                onClick={() => setViewMode('table')}
              >
                <FaList /> Table
              </Button>
            </ButtonGroup>
          </div>

          {isAdmin && (
            <div className="atelier-admin-summary">
              <span>{books.length} BOOKS IN CATALOGUE</span>
              <span>{categories.length} CATEGORIES</span>
              <span>{availableBooks} AVAILABLE</span>
            </div>
          )}

          {message && (
            <Alert variant="success" dismissible onClose={() => setMessage('')}>
              {message}
            </Alert>
          )}

          {error && !showModal && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="atelier-state">
              <Spinner animation="border" variant="secondary" />
              <p>Gathering the collection...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="atelier-state">
              <FaBook />
              <h3>No books found</h3>
              <p>Try another search or adjust your filters.</p>
              <Button className="atelier-search-button" onClick={clearFilters}>
                Clear filters
              </Button>
              {isAdmin && (
                <Button className="atelier-search-button mt-2" onClick={handleAdd}>
                  <FaPlus /> Add a Book
                </Button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="table-responsive atelier-table-wrap">
              <Table hover className="atelier-table align-middle">
                <thead>
                  <tr>
                    <th>BOOK</th>
                    <th>AUTHOR</th>
                    <th>CATEGORY</th>
                    <th>PRICE</th>
                    <th>AVAILABILITY</th>
                    {isAdmin && <th className="text-end">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr key={book.id}>
                      <td>
                        <div className="atelier-table-book">
                          <img
                            src={book.image || 'https://placehold.co/80x110?text=Book'}
                            alt={book.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://placehold.co/80x110?text=Book';
                            }}
                          />
                          <strong>{book.title}</strong>
                        </div>
                      </td>
                      <td>{book.author}</td>
                      <td>{book.category}</td>
                      <td>₹{Number(book.price).toFixed(0)}</td>
                      <td>
                        <span className={`atelier-availability ${book.availability === 'Available' ? 'is-available' : 'is-unavailable'}`}>
                          {book.availability}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="atelier-book-actions">
                            <Button className="atelier-icon-button" onClick={() => handleEdit(book)} aria-label={`Edit ${book.title}`}>
                              <FaEdit />
                            </Button>
                            <Button className="atelier-icon-button delete" onClick={() => handleDelete(book.id)} aria-label={`Delete ${book.title}`}>
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="atelier-book-grid">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {!loading && filteredBooks.length > 0 && (
            <div className="atelier-results-count">
              Showing {filteredBooks.length} of {books.length} books
            </div>
          )}
        </main>
      </Container>

      <footer className="atelier-catalogue-footer" id="catalogue-footer">
        <span>THE LITERARY ATELIER</span>
        <span>Discover your next great read.</span>
        <span>{isAdmin ? 'ADMINISTRATOR VIEW' : 'CUSTOMER COLLECTION'}</span>
      </footer>

      {/* ADD / EDIT MODAL - ADMIN ONLY */}

      {isAdmin && (
        <Modal
          show={showModal}
          onHide={handleClose}
          centered
          size="lg"
          backdrop={saving ? 'static' : true}
        >

          <Modal.Header closeButton={!saving}>
            <div>
              <p className="modal-eyebrow">
                BOOK INVENTORY
              </p>

              <Modal.Title>
                {editingId !== null ? 'Edit Book Details' : 'Add New Book'}
              </Modal.Title>
            </div>
          </Modal.Header>

          <Form onSubmit={handleSubmit}>

            <Modal.Body>

              {error && (
                <Alert variant="danger">
                  {error}
                </Alert>
              )}

              <Row className="g-3">

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Book Title *</Form.Label>
                    <Form.Control
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter book title"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Author *</Form.Label>
                    <Form.Control
                      name="author"
                      value={formData.author}
                      onChange={handleChange}
                      placeholder="Enter author name"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Price (₹) *</Form.Label>
                    <Form.Control
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0.01"
                      step="0.01"
                      placeholder="Enter price"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Category *</Form.Label>
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select category</option>
                      <option>Fiction</option>
                      <option>Finance</option>
                      <option>Self Help</option>
                      <option>Productivity</option>
                      <option>Technology</option>
                      <option>Education</option>
                      <option>Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Availability *</Form.Label>
                    <Form.Select
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                    >
                      <option>Available</option>
                      <option>Out of Stock</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Description *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter book description"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Book Cover</Form.Label>
                    <p className="text-muted small mb-2">
                      Enter the book title and author above. We'll search for a matching cover automatically.
                    </p>

                    {coverLoading && (
                      <div className="d-flex align-items-center gap-2 small mb-2">
                        <Spinner size="sm" animation="border" />
                        Searching Open Library for a cover...
                      </div>
                    )}

                    {coverMessage && (
                      <p className="small mb-2" role="status">{coverMessage}</p>
                    )}

                    {formData.image && (
                      <div className="mb-3">
                        <img
                          src={formData.image}
                          alt="Book cover preview"
                          style={{ width: '100px', height: '140px', objectFit: 'contain', border: '1px solid #ddd', padding: '4px' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                            setCoverMessage('The retrieved cover could not be displayed. You can paste another image URL below.');
                          }}
                        />
                      </div>
                    )}

                    <Form.Control
                      type="url"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="Optional: paste an image URL if no cover is found"
                    />
                    <Form.Text className="text-muted">
                      Image URL is optional. A placeholder will be shown if no cover is available.
                    </Form.Text>
                  </Form.Group>
                </Col>

              </Row>

            </Modal.Body>

            <Modal.Footer>

              <Button
                variant="outline-secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                className="add-book-button"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : editingId !== null ? (
                  <>
                    <FaEdit className="me-2" />
                    Update Book
                  </>
                ) : (
                  <>
                    <FaPlus className="me-2" />
                    Add Book
                  </>
                )}
              </Button>

            </Modal.Footer>

          </Form>

        </Modal>
      )}

    </div>
  );
}

export default App;
