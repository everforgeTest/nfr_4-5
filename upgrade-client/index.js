const fs = require("fs");
const path = require("path");
const HotPocket = require("hotpocket-js-client");
const ContractService = require("./contract-service");
const sodium = require("libsodium-wrappers");

// Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>
(async () => {
  const contractUrl = process.argv[2];
  const filepath = process.argv[3];
  const privateKeyHex = process.argv[4];
  const version = process.argv[5];
  const description = process.argv[6] || "";

  if (!contractUrl || !filepath || !privateKeyHex || !version) {
    console.log("Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>");
    process.exit(1);
  }

  await sodium.ready;
  const fileContent = fs.readFileSync(filepath);

  // HotPocket/Ed25519 private key: treat first 32 bytes as seed to derive full keypair
  const skBytes = Buffer.from(privateKeyHex, "hex");
  const seed = skBytes.slice(0, 32);
  const kp = sodium.crypto_sign_seed_keypair(seed);
  const userKeyPair = { publicKey: Buffer.from(kp.publicKey), privateKey: Buffer.from(kp.privateKey) };

  const service = new ContractService([contractUrl], userKeyPair);
  const ok = await service.init();
  if (!ok) process.exit(2);

  const sig = sodium.crypto_sign_detached(fileContent, kp.privateKey);
  const sigHex = Buffer.from(sig).toString("hex");
  const zipBase64 = fileContent.toString("base64");

  const submitData = {
    service: "Upgrade",
    Action: "UpgradeContract",
    data: {
      version: parseFloat(version),
      description,
      zipBase64,
      sigHex
    }
  };

  console.log(`Uploading ${path.basename(filepath)} (${Math.round(fileContent.length / 1024)}KB)`);
  try {
    const res = await service.submitInput(submitData);
    console.log("Upgrade response:", res);
  } catch (e) {
    console.error("Upgrade failed:", e);
  } finally {
    process.exit(0);
  }
})();
