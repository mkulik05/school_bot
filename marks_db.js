const logger = require("./logger")("get_marks_db")
// const mongo_creds = require("./mongo_creds.json");
const { MongoClient } = require("mongodb");
const dbName = "school_bot";


let get_marks = async (url, id, subj, start, end) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection(id.toString());
    if (col == null) {
      return []
    }
    let marks = []
    let result = await col.find({date: {$exists: true}});
    //console.log(typeof result)
    if (result == null) {
      return []
    }
    await result.forEach((el)=>{
      if (new Date(el.date) > start && new Date(el.date) < end) {
        let keys = Object.keys(el)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]
          if (key.includes(subj)) {
            if (el[key].mark > 0) {
              marks.push([el.date, el[key].mark])
            }
          }
        }
      }
    });
    //logger.debug("result", result)
    logger.debug("marks", JSON.stringify(marks));
    return marks
  } catch (err) {
    logger.error("error", err.stack);
    return [0,0,0]
  } finally {
    await client.close();
  }
};
module.exports = get_marks;
