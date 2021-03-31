const logger = require("./logger")("get_les_db")
// const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const dbName = "school_bot";


let get_lesson = async (url, id) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection(id.toString());
    if (col == null) {
      return 0
    }

    let result = await col.findOne({subjects: {$exists: true}});
    //logger.debug("result", result)
    logger.debug("subj", JSON.stringify(result.subjects));
    if (result == null) {
      return 0
    }
    return result.subjects
  } catch (err) {
    logger.error("error", err.stack);
    return 0
  } finally {
    await client.close();
  }
};
module.exports = get_lesson;
