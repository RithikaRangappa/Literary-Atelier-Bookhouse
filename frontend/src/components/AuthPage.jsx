
import { useState } from 'react';
import { registerUser, loginUser } from '../services/auth';
import atelierLogo from '../assets/literary-atelier-logo.png';
import './AuthPage.css';

function AuthPage({ onAuthSuccess, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isLogin
        ? await loginUser({
            email: formData.email,
            password: formData.password
          })
        : await registerUser(formData);

      onAuthSuccess(response.data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <button
          className="auth-wordmark"
          type="button"
          onClick={onBack}
          aria-label="Return to homepage"
        >
          <img
            src={atelierLogo}
            alt="The Literary Atelier"
            className="auth-logo-image"
            style={{
              width: '58px',
              height: '58px',
              minWidth: '58px',
              maxWidth: '58px',
              objectFit: 'contain',
              flex: '0 0 58px'
            }}
          />

          <span className="auth-brand-copy">
            <strong>THE LITERARY ATELIER</strong>
            <small>A CURATED BOOKHOUSE</small>
          </span>
        </button>

        <button className="auth-back-link" type="button" onClick={onBack}>
          Return to homepage
        </button>
      </header>

      <section className="auth-content">
        <div className="auth-intro">
          <p className="auth-eyebrow">
            {isLogin
              ? 'A PLACE FOR EVERY READER'
              : 'BECOME PART OF OUR COLLECTION'}
          </p>

          <h1>
            {isLogin
              ? <>Discover your <em>next great read.</em></>
              : <>Begin your next<br /><em>chapter here.</em></>}
          </h1>

          <p className="auth-description">
            {isLogin
              ? 'Sign in to explore our considered collection of books, ideas and enduring works.'
              : 'Create your account and discover a world of literature, knowledge and inspiration.'}
          </p>
        </div>

        <div className="auth-form-card">
          <div className="auth-form-heading">
            <span className="auth-form-kicker">
              {isLogin ? 'WELCOME BACK' : 'JOIN THE ATELIER'}
            </span>

            <h2>{isLogin ? 'Sign in' : 'Create an account'}</h2>

            <p>
              {isLogin
                ? 'Enter your details to continue.'
                : 'A few details to begin your membership.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="auth-field">
                <label htmlFor="name">FULL NAME</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">EMAIL ADDRESS</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">PASSWORD</label>

              <div className="auth-password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                />

                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {!isLogin && (
                <span className="auth-field-hint">
                  Use at least 8 characters.
                </span>
              )}
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'PLEASE WAIT...'
                : isLogin
                  ? 'SIGN IN'
                  : 'CREATE ACCOUNT'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="auth-switch">
            {isLogin
              ? "New to The Literary Atelier?"
              : 'Already have an account?'}
            <button type="button" onClick={switchMode}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </div>

          <div className="auth-card-footer">
            A CURATED BOOKHOUSE · EST. 2026
          </div>
        </div>
      </section>

      <footer className="auth-page-footer">
        <span>THE LITERARY ATELIER</span>
        <span>AN APPRECIATION OF THE WRITTEN WORD</span>
      </footer>
    </main>
  );
}

export default AuthPage;
