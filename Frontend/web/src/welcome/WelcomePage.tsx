import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  HandCoins,
  Landmark,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./welcome.css";

type MarketingIcon = ComponentType<{ size?: number; strokeWidth?: number }>;

type Feature = {
  icon: MarketingIcon;
  title: string;
  description: string;
};

const platformFeatures: Feature[] = [
  {
    icon: FileCheck2,
    title: "Structured KYC review",
    description:
      "Keep identity submissions and review status connected to each account.",
  },
  {
    icon: CreditCard,
    title: "Monthly repayment clarity",
    description:
      "Follow one clear installment schedule from disbursement to completion.",
  },
  {
    icon: BarChart3,
    title: "Portfolio visibility",
    description:
      "Review loans, balances, collections, and activity from one lender workspace.",
  },
  {
    icon: MessageSquareText,
    title: "Dispute support",
    description:
      "Keep cases, evidence, and admin review activity organized in one flow.",
  },
  {
    icon: Bot,
    title: "Role-aware AI assistance",
    description:
      "Get read-only help shaped around borrower, lender, or admin responsibilities.",
  },
  {
    icon: BellRing,
    title: "Timely notifications",
    description:
      "Stay informed about applications, installments, payments, and account events.",
  },
];

const lenderBenefits = [
  "Publish and manage lending opportunities",
  "Review borrower applications and loan activity",
  "Track monthly collections and portfolio performance",
];

const borrowerBenefits = [
  "Discover lending opportunities in the mobile experience",
  "Follow applications, loans, and monthly installments",
  "Keep repayments and support activity easy to understand",
];

const workflow = [
  {
    number: "01",
    title: "Create a verified account",
    description:
      "Lenders complete web registration and KYC. Borrowers use the mobile onboarding flow.",
  },
  {
    number: "02",
    title: "Connect through clear terms",
    description:
      "Borrowers apply to lender opportunities and agreed loan terms stay attached to the loan.",
  },
  {
    number: "03",
    title: "Manage every monthly step",
    description:
      "Both sides can follow installments, repayments, notifications, and support activity.",
  },
];

function Brand() {
  return (
    <span className="welcome-brand">
      <span className="welcome-brand__mark" aria-hidden="true">
        SC
      </span>
      <span className="welcome-brand__copy">
        <strong>Smart Credit+</strong>
        <small>Connected lending</small>
      </span>
    </span>
  );
}

function DashboardPreview() {
  return (
    <div
      className="welcome-product-preview"
      aria-label="Smart Credit product preview"
    >
      <div className="welcome-product-preview__glow welcome-product-preview__glow--one" />
      <div className="welcome-product-preview__glow welcome-product-preview__glow--two" />

      <div className="welcome-dashboard-preview">
        <div className="welcome-dashboard-preview__topbar">
          <Brand />
          <span className="welcome-preview-avatar">LR</span>
        </div>

        <div className="welcome-dashboard-preview__content">
          <div className="welcome-preview-heading">
            <div>
              <span>Lender workspace</span>
              <strong>Portfolio overview</strong>
            </div>
            <span className="welcome-preview-status">
              <span /> Live view
            </span>
          </div>

          <div className="welcome-preview-metrics">
            <article>
              <span className="welcome-preview-icon">
                <WalletCards size={18} />
              </span>
              <small>Loan portfolio</small>
              <strong>At a glance</strong>
            </article>
            <article>
              <span className="welcome-preview-icon welcome-preview-icon--green">
                <CircleDollarSign size={18} />
              </span>
              <small>Collections</small>
              <strong>Monthly view</strong>
            </article>
            <article>
              <span className="welcome-preview-icon welcome-preview-icon--violet">
                <Users size={18} />
              </span>
              <small>Borrowers</small>
              <strong>Connected records</strong>
            </article>
          </div>

          <div className="welcome-preview-grid">
            <article className="welcome-preview-chart">
              <div className="welcome-preview-card-heading">
                <div>
                  <strong>Collection activity</strong>
                  <small>Monthly portfolio movement</small>
                </div>
                <BarChart3 size={18} />
              </div>
              <div className="welcome-chart" aria-hidden="true">
                {[42, 62, 54, 78, 68, 88, 74].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="welcome-chart-labels" aria-hidden="true">
                <span>Jan</span>
                <span>Mar</span>
                <span>May</span>
                <span>Jul</span>
              </div>
            </article>

            <article className="welcome-preview-list">
              <div className="welcome-preview-card-heading">
                <div>
                  <strong>Recent activity</strong>
                  <small>Clear status at every step</small>
                </div>
              </div>
              {[
                ["Monthly installment", "Completed", "success"],
                ["Loan application", "In review", "review"],
                ["Account verification", "Approved", "success"],
              ].map(([label, status, tone]) => (
                <div className="welcome-preview-row" key={label}>
                  <span
                    className={`welcome-preview-row__dot welcome-preview-row__dot--${tone}`}
                  />
                  <div>
                    <strong>{label}</strong>
                    <small>{status}</small>
                  </div>
                  <ChevronRight size={15} />
                </div>
              ))}
            </article>
          </div>
        </div>
      </div>

      <div className="welcome-phone-preview" aria-hidden="true">
        <div className="welcome-phone-preview__speaker" />
        <div className="welcome-phone-preview__screen">
          <div className="welcome-phone-preview__header">
            <span>Good morning</span>
            <span className="welcome-phone-preview__bell">
              <BellRing size={15} />
            </span>
          </div>
          <strong>My loan journey</strong>
          <div className="welcome-phone-preview__loan">
            <span>Next installment</span>
            <strong>Monthly schedule</strong>
            <div>
              <span />
            </div>
            <small>Progress stays easy to follow</small>
          </div>
          <div className="welcome-phone-preview__actions">
            <span>
              <CreditCard size={17} />
            </span>
            <span>
              <MessageSquareText size={17} />
            </span>
            <span>
              <Bot size={17} />
            </span>
          </div>
        </div>
      </div>

      <div className="welcome-preview-float welcome-preview-float--verified">
        <span>
          <ShieldCheck size={18} />
        </span>
        <div>
          <strong>Account verified</strong>
          <small>KYC status connected</small>
        </div>
      </div>

      <div className="welcome-preview-float welcome-preview-float--ai">
        <span>
          <Sparkles size={17} />
        </span>
        <div>
          <strong>Ask Smart Credit AI</strong>
          <small>Role-aware, read-only help</small>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <div className="welcome-page">
      <a className="welcome-skip-link" href="#welcome-main">
        Skip to main content
      </a>

      <header className="welcome-header">
        <div className="welcome-container welcome-header__inner">
          <Link
            to="/welcome"
            className="welcome-header__brand"
            onClick={closeMenu}
          >
            <Brand />
          </Link>

          <nav className="welcome-nav" aria-label="Primary navigation">
            <a href="#solutions">Solutions</a>
            <a href="#how-it-works">How it works</a>
            <a href="#platform">Platform</a>
            <a href="#borrower-access">Borrower access</a>
          </nav>

          <div className="welcome-header__actions">
            <Link to="/signin" className="welcome-button welcome-button--quiet">
              Log in
            </Link>
            <Link
              to="/signup"
              className="welcome-button welcome-button--primary"
            >
              Become a lender
              <ArrowRight size={17} />
            </Link>
          </div>

          <button
            type="button"
            className="welcome-menu-button"
            aria-expanded={isMenuOpen}
            aria-controls="welcome-mobile-menu"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        <div
          id="welcome-mobile-menu"
          className={`welcome-mobile-menu${isMenuOpen ? " welcome-mobile-menu--open" : ""}`}
        >
          <nav aria-label="Mobile navigation">
            <a href="#solutions" onClick={closeMenu}>
              Solutions
            </a>
            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>
            <a href="#platform" onClick={closeMenu}>
              Platform
            </a>
            <a href="#borrower-access" onClick={closeMenu}>
              Borrower access
            </a>
            <Link to="/signin" onClick={closeMenu}>
              Log in
            </Link>
            <Link
              to="/signup"
              className="welcome-mobile-menu__primary"
              onClick={closeMenu}
            >
              Become a lender
              <ArrowRight size={17} />
            </Link>
          </nav>
        </div>
      </header>

      <main id="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-hero-title">
          <div className="welcome-hero__orb welcome-hero__orb--one" />
          <div className="welcome-hero__orb welcome-hero__orb--two" />
          <div className="welcome-container welcome-hero__grid">
            <div className="welcome-hero__copy">
              <span className="welcome-eyebrow">
                <Sparkles size={16} />
                One connected credit experience
              </span>
              <h1 id="welcome-hero-title">
                Smarter lending.
                <span> Clearer borrowing.</span>
              </h1>
              <p>
                Smart Credit brings verified accounts, lending opportunities,
                monthly repayments, portfolio oversight, and support into one
                thoughtfully connected platform.
              </p>

              <div className="welcome-hero__actions">
                <Link
                  to="/signup"
                  className="welcome-button welcome-button--primary welcome-button--large"
                >
                  Become a lender
                  <ArrowRight size={19} />
                </Link>
                <a
                  href="#borrower-access"
                  className="welcome-button welcome-button--secondary welcome-button--large"
                >
                  Explore borrower access
                </a>
              </div>

              <div
                className="welcome-hero__assurances"
                aria-label="Platform highlights"
              >
                <span>
                  <CheckCircle2 size={16} /> Structured KYC
                </span>
                <span>
                  <CheckCircle2 size={16} /> Monthly clarity
                </span>
                <span>
                  <CheckCircle2 size={16} /> Role-aware support
                </span>
              </div>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section
          className="welcome-trust-strip"
          aria-label="Smart Credit capabilities"
        >
          <div className="welcome-container welcome-trust-strip__grid">
            <span>
              <ShieldCheck size={19} /> Verified account workflows
            </span>
            <span>
              <CreditCard size={19} /> Monthly installment tracking
            </span>
            <span>
              <Landmark size={19} /> Connected lender operations
            </span>
            <span>
              <Bot size={19} /> Role-aware AI guidance
            </span>
          </div>
        </section>

        <section className="welcome-section welcome-solutions" id="solutions">
          <div className="welcome-container">
            <div className="welcome-section-heading welcome-section-heading--centered">
              <span className="welcome-section-kicker">
                Built for both sides
              </span>
              <h2>A clearer experience for every role</h2>
              <p>
                Each workspace focuses on the information and actions that
                matter to that person—without mixing responsibilities.
              </p>
            </div>

            <div className="welcome-audience-grid">
              <article className="welcome-audience-card welcome-audience-card--lender">
                <div className="welcome-audience-card__visual">
                  <span className="welcome-audience-card__icon">
                    <Landmark size={29} />
                  </span>
                  <span className="welcome-audience-card__label">
                    Lender web workspace
                  </span>
                </div>
                <div className="welcome-audience-card__copy">
                  <span className="welcome-section-kicker">For lenders</span>
                  <h3>Put your lending operations in one place</h3>
                  <p>
                    Move from opportunities to applications, active loans, and
                    monthly collections with a connected portfolio view.
                  </p>
                  <ul>
                    {lenderBenefits.map((benefit) => (
                      <li key={benefit}>
                        <CheckCircle2 size={17} /> {benefit}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="welcome-inline-link">
                    Start lender onboarding <ArrowRight size={17} />
                  </Link>
                </div>
              </article>

              <article className="welcome-audience-card welcome-audience-card--borrower">
                <div className="welcome-audience-card__visual">
                  <span className="welcome-audience-card__icon">
                    <Smartphone size={29} />
                  </span>
                  <span className="welcome-audience-card__label">
                    Borrower mobile experience
                  </span>
                </div>
                <div className="welcome-audience-card__copy">
                  <span className="welcome-section-kicker">For borrowers</span>
                  <h3>Understand each step of your loan journey</h3>
                  <p>
                    Keep opportunities, applications, installments, repayments,
                    and support easy to follow from the mobile experience.
                  </p>
                  <ul>
                    {borrowerBenefits.map((benefit) => (
                      <li key={benefit}>
                        <CheckCircle2 size={17} /> {benefit}
                      </li>
                    ))}
                  </ul>
                  <a href="#borrower-access" className="welcome-inline-link">
                    Learn about mobile access <ArrowRight size={17} />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="welcome-section welcome-workflow" id="how-it-works">
          <div className="welcome-container welcome-workflow__layout">
            <div className="welcome-section-heading">
              <span className="welcome-section-kicker welcome-section-kicker--light">
                How it works
              </span>
              <h2>One connected path from account to repayment</h2>
              <p>
                Smart Credit keeps the important records connected while giving
                borrowers, lenders, and admins their own clear view.
              </p>
              <Link
                to="/signup"
                className="welcome-button welcome-button--light"
              >
                Begin lender onboarding <ArrowRight size={17} />
              </Link>
            </div>

            <div className="welcome-workflow__steps">
              {workflow.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="welcome-section welcome-platform" id="platform">
          <div className="welcome-container">
            <div className="welcome-section-heading welcome-section-heading--centered">
              <span className="welcome-section-kicker">Connected platform</span>
              <h2>The essentials, designed to work together</h2>
              <p>
                Purpose-built capabilities support the full credit lifecycle
                without unnecessary complexity.
              </p>
            </div>

            <div className="welcome-feature-grid">
              {platformFeatures.map(({ icon: Icon, title, description }) => (
                <article className="welcome-feature-card" key={title}>
                  <span className="welcome-feature-card__icon">
                    <Icon size={23} strokeWidth={1.9} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="welcome-section welcome-mobile-access"
          id="borrower-access"
        >
          <div className="welcome-container welcome-mobile-access__card">
            <div className="welcome-mobile-access__copy">
              <span className="welcome-section-kicker welcome-section-kicker--light">
                Borrower mobile access
              </span>
              <h2>Your loan journey, designed for the phone in your hand</h2>
              <p>
                Borrower registration and day-to-day account access are provided
                through the Smart Credit mobile experience. Follow applications,
                active loans, monthly installments, repayment activity, and
                support from one focused interface.
              </p>
              <div className="welcome-mobile-access__note">
                <Smartphone size={20} />
                <div>
                  <strong>Mobile distribution details are coming next</strong>
                  <span>
                    No unavailable app-store link is shown on this page.
                  </span>
                </div>
              </div>
            </div>

            <div className="welcome-mobile-access__visual" aria-hidden="true">
              <div className="welcome-mobile-card welcome-mobile-card--back">
                <HandCoins size={24} />
                <span>Loan opportunities</span>
              </div>
              <div className="welcome-mobile-device">
                <div className="welcome-mobile-device__notch" />
                <div className="welcome-mobile-device__screen">
                  <span className="welcome-mobile-device__eyebrow">
                    Smart Credit+
                  </span>
                  <strong>Monthly overview</strong>
                  <div className="welcome-mobile-device__progress">
                    <span />
                  </div>
                  <small>Track each installment clearly</small>
                  <div className="welcome-mobile-device__tiles">
                    <span>
                      <CreditCard size={18} /> Payments
                    </span>
                    <span>
                      <Bot size={18} /> Ask AI
                    </span>
                  </div>
                </div>
              </div>
              <div className="welcome-mobile-card welcome-mobile-card--front">
                <ShieldCheck size={24} />
                <span>Verified profile</span>
              </div>
            </div>
          </div>
        </section>

        <section className="welcome-final-cta">
          <div className="welcome-container welcome-final-cta__card">
            <div>
              <span className="welcome-section-kicker welcome-section-kicker--light">
                Ready to begin?
              </span>
              <h2>Build a clearer lending experience with Smart Credit.</h2>
              <p>
                Create your lender account, complete KYC, and prepare your
                workspace.
              </p>
            </div>
            <div className="welcome-final-cta__actions">
              <Link
                to="/signup"
                className="welcome-button welcome-button--light welcome-button--large"
              >
                Become a lender <ArrowRight size={19} />
              </Link>
              <Link
                to="/signin"
                className="welcome-button welcome-button--dark-outline welcome-button--large"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="welcome-footer">
        <div className="welcome-container welcome-footer__inner">
          <Brand />
          <p>Connected tools for clearer lending and borrowing.</p>
          <nav aria-label="Footer navigation">
            <Link to="/signin">Log in</Link>
            <Link to="/signup">Lender sign up</Link>
            <a href="#welcome-main">Back to top</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
