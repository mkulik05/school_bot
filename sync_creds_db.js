const logger = require("./logger")("sync_creds_db")
const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const url =
  "mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const dbName = "school_bot";


let get_creds = async (creds = {}) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client(get_creds)");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection("creds");
    if (col == null) {
      await db.createCollection("creds", (err, res) => {
        if (err) {
          logger.error("error in creating collection", err);
        }
        logger.info("system collection created!");
        db.close();
      });
    }
    let result = await col.findOne({ creds: { $exists: true } });
    //logger.debug("result", result)
    if (result == null) {
      await col.insertOne({ creds: creds });
      return {};
    } else {
      if (Object.keys(result.creds).length <= Object.keys(creds).length) {
        await col.replaceOne({ creds: { $exists: true } }, { creds: creds });
        return creds;
      } else {
        creds = result.creds;
        return creds;
      }
    }
  } catch (err) {
    logger.error("error", err.stack);
  } finally {
    await client.close();
  }
};
module.exports = get_creds;
