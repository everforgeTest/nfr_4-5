const { NFTService } = require("../Services/Domain.Services/NFT.service");

class NFTController {
  constructor(message) {
    this.message = message;
    this.service = new NFTService(message);
  }

  async handleRequest() {
    try {
      switch ((this.message.Action || this.message.action || "").trim()) {
        case "MintNFT":
          return await this.service.mintNFT();
        case "GetNFTByTokenId":
          return await this.service.getNFTByTokenId();
        case "TransferNFT":
          return await this.service.transferNFT();
        case "BurnNFT":
          return await this.service.burnNFT();
        case "ListNFTsByOwner":
          return await this.service.listNFTsByOwner();
        default:
          return { error: { code: 400, message: "Invalid NFT action." } };
      }
    } catch (err) {
      return { error: { code: 500, message: err && err.message ? err.message : "Internal error" } };
    }
  }
}

module.exports = { NFTController };
