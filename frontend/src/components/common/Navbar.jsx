
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FolderLock, Menu, X, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="main-navbar">
      <div className="navbar-container">

        {/* Brand */}
        <Link
          to="/"
          className="navbar-brand"
          onClick={closeMenu}
          aria-label="ClientLocker home"
        >
          <span className="navbar-brand-icon">
            <FolderLock size={25} strokeWidth={2.2} />
          </span>

          <span className="navbar-brand-text">
            Client<span>Locker</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar-desktop-links" aria-label="Main navigation">
          <Link
            to="/"
            className={isActive("/") ? "active" : ""}
          >
            Home
          </Link>

          <Link
            to="/about"
            className={isActive("/about") ? "active" : ""}
          >
            About
          </Link>

          <a href="/#features">Features</a>

          <a href="/#contact">Contact</a>

          <Link to="/login" className="navbar-login-btn">
            Sign In
            <ArrowRight size={17} />
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="navbar-menu-toggle"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="navbar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />

            <motion.nav
              id="mobile-navigation"
              className="navbar-mobile-menu"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
            >
              <Link
                to="/"
                className={isActive("/") ? "active" : ""}
                onClick={closeMenu}
              >
                Home
              </Link>

              <Link
                to="/about"
                className={isActive("/about") ? "active" : ""}
                onClick={closeMenu}
              >
                About
              </Link>

              <a href="/#features" onClick={closeMenu}>
                Features
              </a>

              <a href="/#contact" onClick={closeMenu}>
                Contact
              </a>

              <Link
                to="/login"
                className="navbar-mobile-login"
                onClick={closeMenu}
              >
                Sign In
                <ArrowRight size={17} />
              </Link>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
