const fs = require("node:fs");
const path = require("node:path");
const selfsigned = require("selfsigned");

const CERT_DIR_NAME = ".local-https";
const KEY_FILE_NAME = "localhost-key.pem";
const CERT_FILE_NAME = "localhost-cert.pem";
const CERT_TRUST_MODE_ENV_NAME = "DEV_HTTPS_CERT_TRUST_MODE";

function getWorkspaceRoot() {
  return path.resolve(process.env.SEM_APP_WORKSPACE_ROOT || process.env.TICKET_SYSTEM_WORKSPACE_ROOT || process.cwd() || path.resolve(__dirname, ".."));
}

function getDevHttpsCertificatePaths(workspaceRoot = getWorkspaceRoot()) {
  const certDir = path.join(workspaceRoot, CERT_DIR_NAME);

  return {
    certDir,
    keyPath: path.join(certDir, KEY_FILE_NAME),
    certPath: path.join(certDir, CERT_FILE_NAME),
  };
}


function getCertificateTrustMode() {
  const configuredMode = process.env[CERT_TRUST_MODE_ENV_NAME]?.trim().toLowerCase();
  if (configuredMode === "always" || configuredMode === "never" || configuredMode === "create") {
    return configuredMode;
  }

  return "create";
}

function ensureWindowsCertificateTrust(certPath) {
  return {
    checked: false,
    status: "skipped",
    durationMs: 0,
    reason: "command shell certificate import is disabled by default; trust the certificate through an approved IT-managed workflow if required.",
    certPath,
  };
}

function ensureDevHttpsCertificate(workspaceRoot = getWorkspaceRoot()) {
  const paths = getDevHttpsCertificatePaths(workspaceRoot);
  const trustMode = getCertificateTrustMode();
  let generated = false;
  let trust = {
    checked: false,
    status: "skipped",
    durationMs: 0,
    reason: "certificate trust step not needed",
  };

  if (!fs.existsSync(paths.keyPath) || !fs.existsSync(paths.certPath)) {
    generated = true;
    fs.mkdirSync(paths.certDir, { recursive: true });

    const pems = selfsigned.generate(
      [{ name: "commonName", value: "localhost" }],
      {
        algorithm: "sha256",
        days: 825,
        keySize: 2048,
        extensions: [
          { name: "basicConstraints", cA: true },
          {
            name: "keyUsage",
            digitalSignature: true,
            keyEncipherment: true,
            keyCertSign: true,
            cRLSign: true,
          },
          {
            name: "extKeyUsage",
            serverAuth: true,
            clientAuth: true,
          },
          {
            name: "subjectAltName",
            altNames: [
              { type: 2, value: "localhost" },
              { type: 7, ip: "127.0.0.1" },
              { type: 7, ip: "::1" },
            ],
          },
        ],
      },
    );

    fs.writeFileSync(paths.keyPath, pems.private, "utf8");
    fs.writeFileSync(paths.certPath, pems.cert, "utf8");

    const relativeDir = path.relative(workspaceRoot, paths.certDir) || paths.certDir;
    console.log(`[https] Generated local development certificate in ${relativeDir}`);
  }

  if (trustMode === "always" || trustMode === "create") {
    trust = ensureWindowsCertificateTrust(paths.certPath);
  } else if (trustMode === "never") {
    trust = {
      checked: false,
      status: "skipped",
      durationMs: 0,
      reason: `${CERT_TRUST_MODE_ENV_NAME}=never`,
    };
  } else {
    trust = {
      checked: false,
      status: "skipped",
      durationMs: 0,
      reason: "certificate trust step disabled for current mode",
    };
  }

  return {
    ...paths,
    generated,
    trustMode,
    trust,
  };
}

if (require.main === module) {
  ensureDevHttpsCertificate();
}

module.exports = {
  ensureDevHttpsCertificate,
  getDevHttpsCertificatePaths,
  getCertificateTrustMode,
};
