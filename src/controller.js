const bson = require("bson");
const { ServiceTypes } = require("./constants");
const { NFTController } = require("./Controllers/NFT.Controller");
const { UpgradeController } = require("./Controllers/Upgrade.Controller");

class Controller {
  async handleRequest(user, message, isReadOnly) {
    const result = await this.dispatch(user, message, isReadOnly);
    await this.sendOutput(user, result);
  }

  async dispatch(user, message) {
    try {
      const svc = message.Service || message.service || "";
      const userPubKeyHex = this.extractUserPubKey(user);
      message.userPublicKeyHex = userPubKeyHex;

      if (svc === ServiceTypes.UPGRADE) {
        const up = new UpgradeController(message);
        return await up.handleRequest();
      }
      if (svc === ServiceTypes.NFT) {
        const nft = new NFTController(message);
        return await nft.handleRequest();
      }
      return { error: { code: 400, message: "Unknown service." } };
    } catch (e) {
      return { error: { code: 500, message: e && e.message ? e.message : "Server error" } };
    }
  }

  extractUserPubKey(user) {
    try {
      const u = user;
      if (!u) return "";
      if (u.publicKey && typeof u.publicKey === "string") return u.publicKey;
      if (u.publicKey && Buffer.isBuffer(u.publicKey)) return u.publicKey.toString("hex");
      if (u.pubKey && typeof u.pubKey === "string") return u.pubKey;
      if (u.pubKey && Buffer.isBuffer(u.pubKey)) return u.pubKey.toString("hex");
      return "";
    } catch (_) {
      return "";
    }
  }

  async sendOutput(user, response) {
    if (response && response._bson) {
      await user.send(response);
      return;
    }
    const out = JSON.stringify(response);
    await user.send(out);
  }
}

module.exports = { Controller };
