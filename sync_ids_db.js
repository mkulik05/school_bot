const logger = require("./logger")("sync_ids_db")
const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const url =
  "mongodb://localhost:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";
const dbName = "school_bot";

let get_ids_list = async (ids = []) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client(get_ids_list)");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection("system");
    if (col == null) {
      await db.createCollection("system", (err, res) => {
        if (err) {
          logger.error("error in creating collection", err);
        }
        logger.info("system collection created!");
        db.close();
      });
    }
    let result = await col.findOne({ ids: { $exists: true } });
    logger.debug("result - ", result);
    if (result == null) {
      await col.insertOne({ ids: ids });
      return [];
    } else {
      if (result.ids.length <= ids.length) {
        await col.replaceOne({ ids: { $exists: true } }, { ids: ids });
        return ids;
      } else {
        ids = result.ids;
        return ids;
      }
    }
  } catch (err) {
      console.log(err.stack)
    logger.error("error", err.stack);
  } finally {
    await client.close();
  }
};

module.exports = get_ids_list;
