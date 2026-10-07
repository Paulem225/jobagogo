import React from "react";

const logoSrc = "/__mockup/images/jobagogo-launch-logo.png";

function AmberLoader() {
  return (
    <div className="amber-loader" aria-label="Jobagogo se prépare" role="status">
      <span className="amber-loader-point amber-loader-point-one" />
      <span className="amber-loader-point amber-loader-point-two" />
      <span className="amber-loader-point amber-loader-point-three" />
      <span className="amber-loader-point amber-loader-point-four" />
    </div>
  );
}

export function JobagogoMobbinAmber() {
  return (
    <main className="amber-splash-shell">
      <div className="amber-ambient" aria-hidden="true" />
      <div className="amber-ring amber-ring-one" aria-hidden="true" />
      <div className="amber-ring amber-ring-two" aria-hidden="true" />
      <div className="amber-core" aria-hidden="true" />

      <section className="amber-splash-center" aria-label="Jobagogo">
        <div className="amber-logo-stage">
          <img
            className="amber-brand-logo"
            src={logoSrc}
            alt="Jobagogo"
            draggable="false"
          />
        </div>
        <div className="amber-loader-wrap">
          <AmberLoader />
        </div>
      </section>

      <div className="amber-bottom-note" aria-hidden="true">
        <span>Une opportunité arrive</span>
      </div>

      <style>{`
        * { box-sizing: border-box; }

        .amber-splash-shell {
          isolation: isolate;
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 45%, rgba(171, 151, 73, .09), transparent 23%),
            radial-gradient(circle at 50% 87%, rgba(78, 118, 75, .12), transparent 35%),
            linear-gradient(155deg, #151712 0%, #0b0d0b 50%, #101611 100%);
          color: #f1efe6;
          font-family: "DM Sans", "Plus Jakarta Sans", sans-serif;
        }

        .amber-splash-shell::after {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 4;
          opacity: .028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E");
        }

        .amber-splash-center {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-1.5vh);
        }

        .amber-logo-stage {
          width: min(72vw, 286px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          animation: amberMaterialize 1.45s cubic-bezier(.22, 1, .36, 1) both,
            amberSettle 4.8s ease-in-out 1.45s infinite;
        }

        .amber-brand-logo {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          filter: sepia(.14) saturate(.82) drop-shadow(0 0 24px rgba(193, 171, 83, .12));
        }

        .amber-loader-wrap {
          height: 28px;
          display: grid;
          place-items: center;
          margin-top: clamp(24px, 4.8vh, 44px);
          animation: amberLoaderReveal 1.4s cubic-bezier(.22, 1, .36, 1) .3s both;
        }

        .amber-loader {
          position: relative;
          width: 18px;
          height: 18px;
          animation: amberLoaderTurn 3.6s linear infinite;
        }

        .amber-loader-point {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 1.5px;
          background: #c6b66b;
          opacity: .22;
          transform: rotate(45deg);
          animation: amberPointBreathe 1.7s ease-in-out infinite;
        }

        .amber-loader-point-one { top: 0; left: 6.5px; animation-delay: 0s; }
        .amber-loader-point-two { top: 6.5px; right: 0; animation-delay: .22s; }
        .amber-loader-point-three { bottom: 0; left: 6.5px; animation-delay: .44s; }
        .amber-loader-point-four { top: 6.5px; left: 0; animation-delay: .66s; }

        .amber-ambient {
          position: absolute;
          z-index: 0;
          width: min(88vw, 350px);
          aspect-ratio: 1;
          border-radius: 50%;
          background: rgba(158, 142, 64, .11);
          filter: blur(58px);
          opacity: .33;
          animation: amberPulse 4.8s ease-in-out infinite;
        }

        .amber-ring {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 50%;
          width: min(39vw, 155px);
          aspect-ratio: 1;
          border: 1px solid rgba(191, 177, 91, .1);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(.65);
          animation: amberRingOut 5.2s cubic-bezier(.16, 1, .3, 1) infinite;
        }

        .amber-ring-two { animation-delay: 2.6s; opacity: 0; }

        .amber-core {
          position: absolute;
          z-index: 1;
          width: 3px;
          height: 3px;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          background: #c9b96b;
          box-shadow: 0 0 0 5px rgba(168, 154, 73, .07), 0 0 24px rgba(182, 161, 71, .28);
          animation: amberCoreBeat 4.8s ease-in-out infinite;
        }

        .amber-bottom-note {
          position: absolute;
          z-index: 3;
          left: 0;
          right: 0;
          bottom: max(28px, env(safe-area-inset-bottom));
          display: flex;
          justify-content: center;
          color: rgba(217, 214, 194, .38);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .18em;
          text-transform: uppercase;
          animation: amberNoteReveal 1.2s ease-out .95s both;
        }

        @keyframes amberMaterialize {
          from { opacity: 0; transform: translateY(12px) scale(.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes amberSettle {
          0%, 100% { transform: scale(1); }
          48% { transform: scale(1.018); }
          58% { transform: scale(1); }
        }
        @keyframes amberLoaderReveal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes amberPointBreathe {
          0%, 100% { opacity: .18; transform: rotate(45deg) scale(.8); }
          35% { opacity: .95; transform: rotate(45deg) scale(1); }
        }
        @keyframes amberLoaderTurn { to { transform: rotate(360deg); } }
        @keyframes amberPulse {
          0%, 100% { opacity: .2; transform: scale(.82); }
          42% { opacity: .48; transform: scale(1.05); }
          58% { opacity: .28; transform: scale(1); }
        }
        @keyframes amberRingOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.62); }
          12% { opacity: .58; }
          60%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.25); }
        }
        @keyframes amberCoreBeat {
          0%, 100% { opacity: .58; transform: scale(.8); }
          44% { opacity: 1; transform: scale(1.45); }
          55% { opacity: .7; transform: scale(1); }
        }
        @keyframes amberNoteReveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .amber-logo-stage, .amber-loader-wrap, .amber-loader, .amber-loader-point,
          .amber-ambient, .amber-ring, .amber-core, .amber-bottom-note { animation: none; }
          .amber-logo-stage, .amber-loader-wrap, .amber-bottom-note { opacity: 1; }
        }
      `}</style>
    </main>
  );
}

export default JobagogoMobbinAmber;