const { v4: uuidv4 } = require("uuid");
const { Tables } = require("../../constants");
const { SqliteDatabase } = require("../Common.Services/dbHandler").default;
const settings = require("../../settings.json").settings;

function genConcurrencyKey() {
  const ts = Date.now().toString();
  const hex = Number(ts).toString(16).toUpperCase().padStart(14, "0");
  const checksum = 16 - hex.length;
  return `0x${"0".repeat(checksum)}${hex}`;
}

class NFTService {
  constructor(message) {
    this.message = message;
    this.dbPath = settings.dbPath;
    this.db = new SqliteDatabase(this.dbPath);
  }

  async mintNFT() {
    const res = {};
    try {
      const data = this.message.data || {};
      const name = (data.name || "").trim();
      if (!name) throw new Error("'name' is required.");
      const owner = (this.message.userPublicKeyHex || "").toLowerCase();
      if (!owner) throw new Error("Missing user public key.");
      const metadataObj = data.metadata || {};
      let metadataStr = "";
      try { metadataStr = JSON.stringify(metadataObj); } catch (e) { metadataStr = String(metadataObj); }
      const tokenId = data.tokenId && String(data.tokenId).trim() ? String(data.tokenId).trim() : uuidv4();

      this.db.open();
      const insertRes = await this.db.insertValue(Tables.NFTS, {
        TokenId: tokenId,
        Name: name,
        Metadata: metadataStr,
        OwnerPubKey: owner,
        ConcurrencyKey: genConcurrencyKey()
      });
      res.success = { tokenId, id: insertRes.lastId };
      return res;
    } finally {
      this.db.close();
    }
  }

  async getNFTByTokenId() {
    const res = {};
    try {
      const data = this.message.data || {};
      const tokenId = String(data.tokenId || "").trim();
      if (!tokenId) throw new Error("'tokenId' is required.");
      this.db.open();
      const row = await this.db.findBy(Tables.NFTS, "TokenId", tokenId);
      if (!row) return { error: { code: 404, message: "NFT not found." } };
      res.success = {
        id: row.Id,
        tokenId: row.TokenId,
        name: row.Name,
        metadata: row.Metadata,
        ownerPubKey: row.OwnerPubKey,
        createdOn: row.CreatedOn,
        updatedOn: row.UpdatedOn
      };
      return res;
    } finally {
      this.db.close();
    }
  }

  async transferNFT() {
    const res = {};
    try {
      const data = this.message.data || {};
      const tokenId = String(data.tokenId || "").trim();
      const newOwner = String(data.newOwnerPubKey || "").toLowerCase().trim();
      if (!tokenId || !newOwner) throw new Error("'tokenId' and 'newOwnerPubKey' are required.");
      this.db.open();
      const row = await this.db.findBy(Tables.NFTS, "TokenId", tokenId);
      if (!row) return { error: { code: 404, message: "NFT not found." } };
      const updater = await this.db.updateValue(
        Tables.NFTS,
        { OwnerPubKey: newOwner, UpdatedOn: new Date().toISOString() },
        { Id: row.Id }
      );
      res.success = { tokenId, changes: updater.changes };
      return res;
    } finally {
      this.db.close();
    }
  }

  async burnNFT() {
    const res = {};
    try {
      const data = this.message.data || {};
      const tokenId = String(data.tokenId || "").trim();
      if (!tokenId) throw new Error("'tokenId' is required.");
      this.db.open();
      const row = await this.db.findBy(Tables.NFTS, "TokenId", tokenId);
      if (!row) return { error: { code: 404, message: "NFT not found." } };
      const del = await this.db.deleteValues(Tables.NFTS, { Id: row.Id });
      res.success = { tokenId, changes: del.changes };
      return res;
    } finally {
      this.db.close();
    }
  }

  async listNFTsByOwner() {
    const res = {};
    try {
      const data = this.message.data || {};
      const owner = String(data.ownerPubKey || "").toLowerCase().trim();
      if (!owner) throw new Error("'ownerPubKey' is required.");
      this.db.open();
      const rows = await this.db.getValues(Tables.NFTS, { OwnerPubKey: owner });
      res.success = rows.map(r => ({
        id: r.Id,
        tokenId: r.TokenId,
        name: r.Name,
        metadata: r.Metadata,
        ownerPubKey: r.OwnerPubKey,
        createdOn: r.CreatedOn,
        updatedOn: r.UpdatedOn
      }));
      return res;
    } finally {
      this.db.close();
    }
  }
}

module.exports = { NFTService };
