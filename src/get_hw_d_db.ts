import { create_log } from './logger';
const logger = create_log('get_marks_db');
// const mongo_creds = require("./mongo_creds.json");
import { MongoClient } from 'mongodb';
const dbName = 'school_bot';

let get_hw_d = async (url: string, id: string, start: Date, end: Date) => {
	const client = new MongoClient(url, { useUnifiedTopology: true });
	logger.info('created new mongo client');
	try {
		await client.connect();
		const db = client.db(dbName);
		let col = db.collection(id.toString());
		if (col == null) {
			return [];
		}
		let resp = [];
		let result = await col.find({ date: { $exists: true } });
		//console.log(typeof result)
		if (result == null) {
			return [];
		}
		await result.forEach((el) => {
			if (new Date(el.date) >= start && new Date(el.date) <= end) {
				let keys = Object.keys(el);
				let unres = [ el.date, [] ];
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i];
          if (!["date", "_id"].includes(key)) {
            unres[1].push([ key, el[key].hw ]);
          }
				}
				resp.push(unres);
			}
		});
		logger.debug('marks', JSON.stringify(resp));
		return resp;
	} catch (err) {
		logger.error('error', err.stack);
		return [ 0, 0, 0 ];
	} finally {
		await client.close();
	}
};
export { get_hw_d };
