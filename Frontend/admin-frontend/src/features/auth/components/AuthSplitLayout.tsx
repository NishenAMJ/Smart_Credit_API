import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { authStyles } from "../config/auth-styles";
import type { AuthContent } from "../config/auth-content";

interface AuthSplitLayoutProps {
  content: AuthContent;
  title: string;
  children: ReactNode;
}

export default function AuthSplitLayout({
  content,
  title,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div style={authStyles.page}>
      <div style={authStyles.left}>
        <div style={authStyles.leftGlow} />
        <div style={authStyles.leftInner}>
          <div style={authStyles.logoRow}>
            <div style={authStyles.logoIcon}>{content.logoText}</div>
            <span style={authStyles.logoText}>{content.brandName}</span>
          </div>

          <div style={authStyles.headline}>
            <h1 style={authStyles.h1}>
              {content.heroTitleStart}
              <br />
              <span style={authStyles.h1Blue}>{content.heroHighlight}</span>
              <br />
              {content.heroTitleEnd}
            </h1>
            <p style={authStyles.tagline}>{content.heroDescription}</p>
          </div>

          <div style={authStyles.statsRow}>
            {content.stats.map((item) => (
              <div key={item.label} style={authStyles.statItem}>
                <div style={authStyles.statValue}>{item.value}</div>
                <div style={authStyles.statLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={authStyles.right}>
        <div style={authStyles.formShell}>
          <div style={authStyles.formCard}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={authStyles.formTitle}>{title}</h2>
              <p style={authStyles.formSub}>{content.subtitle}</p>
            </div>

            {children}

            <p style={authStyles.footerText}>
              {content.footerPrompt}{" "}
              <Link to={content.footerTo} style={authStyles.link}>
                {content.footerAction}
              </Link>
            </p>

            {content.demoCredentials ? (
              <div style={authStyles.demoBox}>
                <span style={authStyles.demoLabel}>Access</span>
                <span style={authStyles.demoValue}>{content.demoCredentials}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
