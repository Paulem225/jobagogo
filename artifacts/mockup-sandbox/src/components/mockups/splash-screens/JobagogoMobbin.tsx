import React from "react";

const logoSrc = "/__mockup/images/jobagogo-launch-logo.png";

function FourPointLoader() {
  return (
    <div className="loader" aria-label="Jobagogo se prépare" role="status">
      <span className="loader-point point-one" />
      <span className="loader-point point-two" />
      <span className="loader-point point-three" />
      <span className="loader-point point-four" />
    </div>
  );
}

export function JobagogoMobbin() {
  return (
    <main className="splash-shell">
      <div className="ambient-pulse" aria-hidden="true" />
      <div className="signal-ring signal-ring-one" aria-hidden="true" />
      <div className="signal-ring signal-ring-two" aria-hidden="true" />
      <div className="signal-core" aria-hidden="true" />

      <section className="splash-center" aria-label="Jobagogo">
        <div className="logo-stage">
          <img
            className="brand-logo"
            src={logoSrc}
            alt="Jobagogo"
            draggable="false"
          />
        </div>
        <div className="loader-wrap">
          <FourPointLoader />
        </div>
      </section>

      <div className="bottom-note" aria-hidden="true">
        <span>Une opportunité arrive</span>
      </div>

      <style>{`
        :root {
          color-scheme: dark;
        }

        * { box-sizing: border-box; }

        .splash-shell {
          isolation: isolate;
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 48%, rgba(50, 194, 112, 0.085), transparent 25%),
            linear-gradient(155deg, #07100c 0%, #020604 52%, #07140e 100%);
          color: #f4f8f2;
          font-family: "DM Sans", "Plus Jakarta Sans", sans-serif;
        }

        .splash-shell::after {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 4;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E");
        }

        .splash-center {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-1.5vh);
        }

        .logo-stage {
          width: min(72vw, 286px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          animation: materialize 1.45s cubic-bezier(.22, 1, .36, 1) both,
            settle 4.8s ease-in-out 1.45s infinite;
        }

        .brand-logo {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          filter: drop-shadow(0 0 22px rgba(61, 206, 122, 0.08));
        }

        .loader-wrap {
          height: 28px;
          display: grid;
          place-items: center;
          margin-top: clamp(24px, 4.8vh, 44px);
          animation: loaderReveal 1.4s cubic-bezier(.22, 1, .36, 1) .3s both;
        }

        .loader {
          position: relative;
          width: 18px;
          height: 18px;
          animation: loaderTurn 3.6s linear infinite;
        }

        .loader-point {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 1.5px;
          background: #65d58a;
          opacity: .22;
          transform: rotate(45deg);
          animation: pointBreathe 1.7s ease-in-out infinite;
        }

        .point-one { top: 0; left: 6.5px; animation-delay: 0s; }
        .point-two { top: 6.5px; right: 0; animation-delay: .22s; }
        .point-three { bottom: 0; left: 6.5px; animation-delay: .44s; }
        .point-four { top: 6.5px; left: 0; animation-delay: .66s; }

        .ambient-pulse {
          position: absolute;
          z-index: 0;
          width: min(88vw, 350px);
          aspect-ratio: 1;
          border-radius: 50%;
          background: rgba(45, 197, 106, .09);
          filter: blur(52px);
          opacity: .3;
          animation: pulse 4.8s ease-in-out infinite;
        }

        .signal-ring {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 50%;
          width: min(39vw, 155px);
          aspect-ratio: 1;
          border: 1px solid rgba(91, 219, 132, .08);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(.65);
          animation: ringOut 5.2s cubic-bezier(.16, 1, .3, 1) infinite;
        }

        .signal-ring-two {
          animation-delay: 2.6s;
          opacity: 0;
        }

        .signal-core {
          position: absolute;
          z-index: 1;
          width: 3px;
          height: 3px;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          background: #73df97;
          box-shadow: 0 0 0 5px rgba(81, 211, 124, .06), 0 0 24px rgba(81, 211, 124, .3);
          animation: coreBeat 4.8s ease-in-out infinite;
        }

        .bottom-note {
          position: absolute;
          z-index: 3;
          left: 0;
          right: 0;
          bottom: max(30px, env(safe-area-inset-bottom));
          padding: 0 24px;
          text-align: center;
          color: rgba(195, 224, 202, .34);
          font-size: 10px;
          letter-spacing: .16em;
          text-transform: uppercase;
          animation: noteReveal 1.6s ease-out .8s both;
        }

        @keyframes materialize {
          from { opacity: 0; transform: scale(.88); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes settle {
          0%, 100% { transform: scale(1); }
          48% { transform: scale(1.018); }
          58% { transform: scale(1); }
        }
        @keyframes loaderReveal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pointBreathe {
          0%, 100% { opacity: .18; transform: rotate(45deg) scale(.8); }
          35% { opacity: .95; transform: rotate(45deg) scale(1); }
        }
        @keyframes loaderTurn { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: .2; transform: scale(.82); }
          42% { opacity: .48; transform: scale(1.05); }
          58% { opacity: .28; transform: scale(1); }
        }
        @keyframes ringOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.62); }
          12% { opacity: .58; }
          60%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.25); }
        }
        @keyframes coreBeat {
          0%, 100% { opacity: .58; transform: scale(.8); }
          44% { opacity: 1; transform: scale(1.45); }
          55% { opacity: .7; transform: scale(1); }
        }
        @keyframes noteReveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-stage, .loader-wrap, .loader, .loader-point, .ambient-pulse,
          .signal-ring, .signal-core, .bottom-note { animation: none; }
          .logo-stage, .loader-wrap, .bottom-note { opacity: 1; }
        }
      `}</style>
    </main>
  );
}

export default JobagogoMobbin;