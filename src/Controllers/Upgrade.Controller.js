const sodium = require("libsodium-wrappers");
const { UpgradeService } = require("../Services/Common.Services/Upgrade.Service");

function toHexLower(s) {
  return (s || "").toString().toLowerCase();
}

function isMaintainer(userPubKeyHex) {
  const expected = (process.env.MAINTAINER_PUBKEY || "").toLowerCase();
  if (!expected || expected.length === 0) return false;
  return toHexLower(userPubKeyHex) === expected;
}

class UpgradeController {
  constructor(message) {
    this.message = message;
    this.service = new UpgradeService(message);
  }

  async handleRequest() {
    try {
      const action = (this.message.Action || this.message.action || "").trim();
      if (action !== "UpgradeContract") return { error: { code: 400, message: "Invalid upgrade action." } };

      const userPub = this.message.userPublicKeyHex || "";
      if (!isMaintainer(userPub)) return { error: { code: 401, message: "Unauthorized" } };

      const data = this.message.data || {};
      const version = parseFloat(data.version);
      const description = data.description || "";
      const zipBase64 = data.zipBase64 || "";
      const sigHex = data.sigHex || "";

      if (!zipBase64 || !sigHex) return { error: { code: 400, message: "zipBase64 and sigHex are required." } };

      await sodium.ready;
      const zipBuffer = Buffer.from(zipBase64, "base64");
      const signature = Buffer.from(sigHex, "hex");
      let pubKeyBytes = Buffer.from(userPub, "hex");

      const verified = sodium.crypto_sign_detached_verify(zipBuffer, signature, pubKeyBytes);
      if (!verified) return { error: { code: 401, message: "Signature verification failed." } };

      return await this.service.upgradeContract({ version, description, zipBuffer });
    } catch (err) {
      return { error: { code: 500, message: err && err.message ? err.message : "Upgrade failed" } };
    }
  }
}

module.exports = { UpgradeController };
