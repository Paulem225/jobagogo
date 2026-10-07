const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const keyId = "F767UYHTWZ";
const privateKey = process.env.APPLE_AUTH_KEY_P8;
const issuerId = process.env.APPLE_APP_STORE_CONNECT_ISSUER_ID;
const easArgs = process.argv.slice(2);
if (easArgs[0] === "--") easArgs.shift();

if (!privateKey) {
  console.error("La clé App Store Connect APPLE_AUTH_KEY_P8 est introuvable dans les secrets Replit.");
  process.exit(1);
}

if (!issuerId) {
  console.error("L’Issuer ID App Store Connect est introuvable dans APPLE_APP_STORE_CONNECT_ISSUER_ID.");
  process.exit(1);
}

if (easArgs.length === 0) {
  console.error("Utilisation : pnpm --filter @workspace/mobile run eas:ios -- <commande EAS>");
  process.exit(1);
}

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jobagogo-asc-"));
const keyPath = path.join(temporaryDirectory, `AuthKey_${keyId}.p8`);

try {
  fs.writeFileSync(keyPath, privateKey.replace(/\r\n/g, "\n"), { encoding: "utf8", mode: 0o600 });

  const result = spawnSync(
    "pnpm",
    ["dlx", "eas-cli@24.0.0", ...easArgs],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        EXPO_ASC_API_KEY_PATH: keyPath,
        EXPO_ASC_KEY_ID: keyId,
        EXPO_ASC_ISSUER_ID: issuerId,
      },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}