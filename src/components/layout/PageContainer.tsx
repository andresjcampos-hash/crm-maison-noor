"use client";

type PageContainerProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageContainer({
  kicker = "Maison Noor",
  title,
  subtitle,
  actions,
  children,
}: PageContainerProps) {
  return (
    <section className="pageContainer">
      <header className="pageHeader">
        <div>
          <div className="kicker">{kicker}</div>
          <h1 className="title">{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="actions">{actions}</div>}
      </header>

      <div className="pageBody">{children}</div>

      <style jsx>{`
        .pageContainer {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(200, 162, 106, 0.18);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.01)
          );
        }

        .kicker {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(200, 162, 106, 0.95);
          font-weight: 800;
        }

        .title {
          margin-top: 6px;
          font-size: 28px;
          font-weight: 900;
        }

        .subtitle {
          margin-top: 6px;
          opacity: 0.75;
        }

        .actions {
          display: flex;
          gap: 10px;
        }

        .pageBody {
          margin-top: 16px;
        }

        @media (max-width: 900px) {
          .pageHeader {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
