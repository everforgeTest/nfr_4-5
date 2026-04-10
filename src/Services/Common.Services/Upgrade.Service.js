const fs = require("fs");
const { Tables } = require("../../constants");
const { SqliteDatabase } = require("./dbHandler").default;
const settings = require("../../settings.json").settings;

class UpgradeService {
  constructor(message) {
    this.message = message;
    this.db = new SqliteDatabase(settings.dbPath);
  }

  async upgradeContract(payload) {
    const resObj = {};
    try {
      const { version, description, zipBuffer } = payload;
      if (!version || isNaN(version)) return { error: { code: 400, message: "Invalid version." } };

      this.db.open();
      const last = await this.db.getLastRecord(Tables.CONTRACTVERSION);
      const currentVersion = last && last.Version ? parseFloat(last.Version) : 1.0;
      if (!(version > currentVersion)) {
        return { error: { code: 403, message: "Incoming version must be greater than current version." } };
      }

      fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

      const script = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(settings.postExecutionScriptName, script);
      fs.chmodSync(settings.postExecutionScriptName, 0o777);

      const ins = await this.db.insertValue(Tables.CONTRACTVERSION, {
        Version: version,
        Description: description
      });
      resObj.success = { message: "Contract upgraded.", id: ins.lastId };
      return resObj;
    } catch (e) {
      return { error: { code: 500, message: e && e.message ? e.message : "Upgrade failed." } };
    } finally {
      this.db.close();
    }
  }
}

module.exports = { UpgradeService };
