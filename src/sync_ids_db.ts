import {create_log} from "./logger"
const logger = create_log("sync_ids_db")
import { MongoClient } from 'mongodb';
const dbName = 'school_bot';

let get_ids	 = async (url: string, ids = []) => {
	const client = new MongoClient(url, { useUnifiedTopology: true });
	logger.info('created new mongo client(get_ids_list)');
	try {
		await client.connect();
		const db = client.db(dbName);
		let col = db.collection('system');
		if (col == null) {
			await db.createCollection('system', (err, res) => {
				if (err) {
					logger.error('error in creating collection', err);
				}
				logger.info('system collection created!');
			});
		}
		let result = await col.findOne({ ids: { "$exists": true } });
		logger.debug('result - ', result);
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
		console.log(err.stack);
		logger.error('error', err.stack);
		return [];
	} finally {
		await client.close();
	}
};

export {get_ids};
