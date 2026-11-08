
import {
  ShieldCheck,
  FolderLock,
  FileText,
  Users,
  ArrowRight,
  LockKeyhole,
  CheckCircle,
  Clock,
  Cloud
} from "lucide-react";

import { motion } from "framer-motion";
import "./Home.css";

// Animation settings
const fadeUp = {
  hidden: {
    opacity: 0,
    y: 60,
    filter: "blur(8px)"
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

const fadeLeft = {
  hidden: {
    opacity: 0,
    x: -70
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 1,
      ease: "easeOut"
    }
  }
};

const fadeRight = {
  hidden: {
    opacity: 0,
    x: 70
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 1,
      ease: "easeOut"
    }
  }
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18
    }
  }
};

const cardContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

function Home() {
  return (
    <main className="home-page">

      {/* Hero Section */}
      <motion.section
        className="home-hero"
        id="home"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div
          className="hero-content"
          variants={fadeLeft}
        >
          <motion.div className="hero-badge" variants={fadeUp}>
            <ShieldCheck size={16} />
            SECURE CLIENT DOCUMENT PORTAL
          </motion.div>

          <motion.h1 variants={fadeUp}>
            Your Documents.
            <span> Our Priority.</span>
          </motion.h1>

          <motion.p variants={fadeUp}>
            Manage, organize and access your important business
            documents through one secure and reliable client portal
            from Vaigai Vel & Associates.
          </motion.p>

          <motion.div className="hero-buttons" variants={fadeUp}>
            <a href="/login" className="home-primary-btn">
              Access Your Portal
              <ArrowRight size={18} />
            </a>

            <a href="#about" className="home-secondary-btn">
              Discover More
            </a>
          </motion.div>

          <motion.div className="hero-trust" variants={fadeUp}>
            <LockKeyhole size={17} />
            Private access. Protected documents. Trusted management.
          </motion.div>
        </motion.div>

        {/* Animated Document Illustration */}
        <motion.div
          className="hero-illustration"
          variants={fadeRight}
        >
          <motion.div
            className="hero-circle"
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.35, 0.65, 0.35]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.div
            className="hero-document-card"
            initial={{ opacity: 0, y: 100, rotate: 5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{
              duration: 1.2,
              delay: 0.3,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            <div className="hero-card-header">
              <div className="hero-card-icon">
                <FolderLock size={26} />
              </div>

              <span className="secure-status">
                <span></span> SECURE PORTAL
              </span>
            </div>

            <h3>Document Management</h3>

            <p className="hero-card-description">
              Your business files, organized and protected.
            </p>

            {[
              {
                title: "Financial Documents",
                subtitle: "PDF documents"
              },
              {
                title: "Tax Documents",
                subtitle: "Private files"
              },
              {
                title: "Business Records",
                subtitle: "Securely managed"
              }
            ].map((file, index) => (
              <motion.div
                className="hero-file-row"
                key={file.title}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.9 + index * 0.2
                }}
              >
                <div className="hero-file-icon">
                  <FileText />
                </div>

                <div>
                  <strong>{file.title}</strong>
                  <small>{file.subtitle}</small>
                </div>

                <CheckCircle className="file-check" />
              </motion.div>
            ))}

            <div className="hero-card-footer">
              <ShieldCheck size={18} />
              Protected document access
            </div>
          </motion.div>

          <motion.div
            className="hero-floating-lock"
            animate={{
              y: [0, -16, 0],
              rotate: [0, 8, 0]
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <LockKeyhole size={25} />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* About Section */}
      <motion.section
        className="home-about"
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.span
          className="home-section-label"
          variants={fadeUp}
        >
          ABOUT CLIENTLOCKER
        </motion.span>

        <motion.h2 variants={fadeUp}>
          A better way to manage client documents.
        </motion.h2>

        <motion.p variants={fadeUp}>
          ClientLocker is a private document management portal
          designed for Vaigai Vel & Associates. It helps manage
          client files, control access and organize important
          business records.
        </motion.p>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="home-features"
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        <motion.span
          className="home-section-label"
          variants={fadeUp}
        >
          OUR FEATURES
        </motion.span>

        <motion.h2 variants={fadeUp}>
          Everything organized. Everything protected.
        </motion.h2>

        <motion.p
          className="features-intro"
          variants={fadeUp}
        >
          A centralized portal designed for secure and organized
          client document management.
        </motion.p>

        <motion.div
          className="home-feature-grid"
          variants={cardContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {[
            {
              icon: ShieldCheck,
              title: "Secure Access",
              description:
                "Role-based permissions help users access only the documents they are authorized to view."
            },
            {
              icon: FolderLock,
              title: "Private File Storage",
              description:
                "Manage important client documents through private, controlled file access."
            },
            {
              icon: Users,
              title: "Access Management",
              description:
                "Manage staff and client access according to assigned permissions."
            },
            {
              icon: FileText,
              title: "Document Checklist",
              description:
                "Organize required documents and track checklist completion for each client."
            },
            {
              icon: Clock,
              title: "Activity Tracking",
              description:
                "Maintain a record of important document activities and access events."
            },
            {
              icon: Cloud,
              title: "Controlled Downloads",
              description:
                "Access documents through temporary, authorized download links."
            }
          ].map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                className="home-feature-card"
                key={feature.title}
                variants={fadeUp}
                whileHover={{
                  y: -10,
                  scale: 1.025,
                  transition: { duration: 0.25 }
                }}
              >
                <motion.div
                  className="home-feature-icon"
                  whileHover={{
                    rotate: 8,
                    scale: 1.12
                  }}
                  transition={{ duration: 0.25 }}
                >
                  <Icon />
                </motion.div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </motion.section>

      {/* Call To Action */}
      <motion.section
        className="home-cta"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeLeft}>
          <span className="home-section-label">
            CLIENT PORTAL
          </span>

          <h2>
            Your documents are just a sign-in away.
          </h2>

          <p>
            Access your authorized documents through the
            ClientLocker portal.
          </p>
        </motion.div>

        <motion.a
          href="/login"
          className="home-cta-btn"
          variants={fadeRight}
          whileHover={{ scale: 1.06, y: -4 }}
          whileTap={{ scale: 0.96 }}
        >
          Sign In Now
          <ArrowRight size={18} />
        </motion.a>
      </motion.section>

    </main>
  );
}

export default Home;
