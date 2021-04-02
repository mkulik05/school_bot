import {create_log} from "./logger"
const logger = create_log("get_marks_db")
// const mongo_creds = require("./mongo_creds.json");
import { MongoClient } from "mongodb";
const dbName = "school_bot";


let get_marks = async (url: string, id: string, subj: string, start: Date, end: Date) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  logger.info("created new mongo client");
  try {
    await client.connect();
    const db = client.db(dbName);
    let col = db.collection(id.toString());
    if (col == null) {
      return []
    }
    let marks: Array<[string, number]> = []
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
export {get_marks};
