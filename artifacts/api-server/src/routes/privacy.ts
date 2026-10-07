import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Politique de confidentialité — Jobagogo</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      line-height: 1.7;
      padding: 40px 24px 80px;
    }
    .container { max-width: 720px; margin: 0 auto; }
    .logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #fff; margin-bottom: 48px; display: flex; align-items: center; gap: 10px; }
    .logo-dot { width: 28px; height: 28px; border: 2.5px solid #fff; border-radius: 50%; }
    h1 { font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: -0.8px; }
    .updated { font-size: 13px; color: #737373; margin-bottom: 40px; }
    h2 { font-size: 18px; font-weight: 600; color: #fff; margin: 36px 0 12px; }
    p { margin-bottom: 14px; color: #a3a3a3; font-size: 15px; }
    ul { padding-left: 20px; margin-bottom: 14px; }
    li { margin-bottom: 6px; color: #a3a3a3; font-size: 15px; }
    a { color: #4ade80; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .divider { border: none; border-top: 1px solid #262626; margin: 32px 0; }
    .contact-card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 20px 24px; margin-top: 16px; }
    .contact-card p { margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-dot"></div>
      JOBAGOGO
    </div>

    <h1>Politique de confidentialité</h1>
    <p class="updated">Dernière mise à jour : 17 août 2026</p>

    <p>
      La présente politique de confidentialité décrit comment Jobagogo (« nous », « notre », « nos ») collecte,
      utilise et protège vos informations personnelles lorsque vous utilisez notre application mobile
      Jobagogo (disponible sur Google Play).
    </p>

    <hr class="divider" />

    <h2>1. Informations que nous collectons</h2>
    <p>Lors de l'utilisation de Jobagogo, nous pouvons collecter les données suivantes :</p>
    <ul>
      <li><strong>Informations de profil</strong> : nom, titre de poste, localisation (ville), années d'expérience, compétences, préférences de contrat et de salaire.</li>
      <li><strong>Coordonnées</strong> : adresse e-mail, numéro de téléphone et profil LinkedIn (tous optionnels).</li>
      <li><strong>Documents CV</strong> : fichiers PDF, Word ou texte que vous importez volontairement pour analyse.</li>
      <li><strong>Données d'utilisation</strong> : offres d'emploi consultées, sauvegardées ou ignorées, afin d'améliorer la pertinence de vos correspondances.</li>
    </ul>

    <hr class="divider" />

    <h2>2. Comment nous utilisons vos données</h2>
    <p>Vos données sont utilisées exclusivement pour :</p>
    <ul>
      <li>Vous présenter des offres d'emploi personnalisées correspondant à votre profil.</li>
      <li>Analyser votre CV par intelligence artificielle afin d'extraire vos compétences, expériences et formations.</li>
      <li>Gérer votre abonnement Premium et les transactions associées.</li>
      <li>Améliorer la qualité de nos algorithmes de correspondance.</li>
    </ul>
    <p>Nous ne vendons, ne louons et ne partageons jamais vos données personnelles avec des tiers à des fins publicitaires ou commerciales.</p>

    <hr class="divider" />

    <h2>3. Partage des données</h2>
    <p>
      Vos données ne sont pas partagées avec des tiers, à l'exception des sous-traitants techniques
      indispensables au fonctionnement du service (hébergement sécurisé, traitement IA du CV).
      Ces prestataires sont contractuellement tenus à la confidentialité et ne peuvent utiliser
      vos données qu'aux fins définies.
    </p>

    <hr class="divider" />

    <h2>4. Sécurité des données</h2>
    <p>
      Toutes les communications entre l'application et nos serveurs sont chiffrées via HTTPS/TLS.
      Vos données sont stockées sur des serveurs sécurisés. Nous appliquons des mesures techniques
      et organisationnelles appropriées pour protéger vos informations contre tout accès non autorisé,
      perte ou destruction.
    </p>

    <hr class="divider" />

    <h2>5. Conservation des données</h2>
    <p>
      Vos données sont conservées tant que votre compte est actif. Si vous supprimez votre profil,
      l'ensemble de vos données personnelles et documents CV sont effacés de nos systèmes
      dans un délai de 30 jours.
    </p>

    <hr class="divider" />

    <h2>6. Vos droits</h2>
    <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
    <ul>
      <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.</li>
      <li><strong>Droit de rectification</strong> : corriger des données inexactes.</li>
      <li><strong>Droit à l'effacement</strong> : demander la suppression de votre compte et de vos données.</li>
      <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format lisible par machine.</li>
      <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements de vos données.</li>
    </ul>
    <p>
      Pour exercer ces droits, supprimez votre profil directement depuis l'application
      (onglet Profil → Supprimer le compte) ou contactez-nous par e-mail.
    </p>

    <hr class="divider" />

    <h2>7. Données des mineurs</h2>
    <p>
      Jobagogo est destiné aux personnes âgées de 18 ans et plus.
      Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 18 ans.
    </p>

    <hr class="divider" />

    <h2>8. Modifications de la politique</h2>
    <p>
      Nous pouvons mettre à jour cette politique de confidentialité périodiquement.
      En cas de modification substantielle, nous vous en informerons via l'application.
      La date de la dernière mise à jour est toujours indiquée en haut de cette page.
    </p>

    <hr class="divider" />

    <h2>9. Contact</h2>
    <p>Pour toute question relative à cette politique ou à vos données personnelles :</p>
    <div class="contact-card">
      <p>
        <strong style="color:#fff;">Jobagogo</strong><br />
        E-mail : <a href="mailto:contact@jobagogo.pro">contact@jobagogo.pro</a><br />
        Site web : <a href="https://jobagogo.pro" target="_blank" rel="noopener">jobagogo.pro</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(html);
});

export default router;
