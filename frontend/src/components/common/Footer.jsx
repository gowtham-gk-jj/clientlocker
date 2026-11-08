
import { Link } from "react-router-dom";
import {
  FolderLock,
  ShieldCheck,
  MapPin,
  ArrowUpRight
} from "lucide-react";

import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="main-footer" id="contact">
      <div className="footer-container">

        {/* Brand Information */}
        <div className="footer-brand-section">
          <Link to="/" className="footer-brand">
            <span className="footer-brand-icon">
              <FolderLock size={24} />
            </span>

            <span className="footer-brand-name">
              Client<span>Locker</span>
            </span>
          </Link>

          <p className="footer-description">
            A private client document management portal
            designed for Vaigai Vel & Associates.
          </p>

          <div className="footer-security">
            <ShieldCheck size={18} />
            <span>Secure client document management</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-links-section">
          <h3>Quick Links</h3>

          <Link to="/">
            Home <ArrowUpRight size={14} />
          </Link>

          <Link to="/about">
            About Us <ArrowUpRight size={14} />
          </Link>

          <Link to="/#features">
            Features <ArrowUpRight size={14} />
          </Link>

          <Link to="/login">
            Client Portal <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Firm Information */}
        <div className="footer-contact-section">
          <h3>Firm Information</h3>

          <div className="footer-contact-item">
            <MapPin size={19} />
            <div>
              <strong>Location</strong>
              <span>Madurai, Tamil Nadu, India</span>
            </div>
          </div>

          <div className="footer-contact-item">
            <FolderLock size={19} />
            <div>
              <strong>Organization</strong>
              <span>Vaigai Vel & Associates</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Footer */}
      <div className="footer-bottom">
        <p>
          © {currentYear} ClientLocker. All rights reserved.
        </p>

        <p>
          A secure document management portal.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
