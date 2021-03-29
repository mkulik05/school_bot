const logger = require('./logger')('database');
//const mongo_creds = require('./mongo_creds.json');
const { MongoClient } = require('mongodb');
//const url = `mongodb+srv://${mongo_creds.user}:${mongo_creds.password}@cluster0.hvnia.mongodb.net/test?authSource=admin&replicaSet=atlas-zd20rv-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;
const dbName = 'school_bot';

let objs_are_simple = (obj1, obj2, tg_id, skip_keys = [ '_id' ]) => {
	logger.info({ tg_id: tg_id }, 'function objs_are_simple called');
	logger.debug({ tg_id: tg_id }, 'obj1', JSON.stringify(obj1, null, 2), 'obj2', JSON.stringify(obj2, null, 2));
	let keys1 = Object.keys(obj1);
	let keys2 = Object.keys(obj1);
	let key = '';
	for (let i = 0; i < keys1.length; i++) {
		key = keys1[i];
		if (keys2.includes(key)) {
			if (!skip_keys.includes(key)) {
				if (JSON.stringify(obj1[key]) != JSON.stringify(obj2[key])) {
					logger.info({ tg_id: tg_id }, 'objects are not equal');
					return false;
				}
			}
		}
	}
	logger.info({ tg_id: tg_id }, 'objects are equal');
	return true;
};

let update_db = async (url, data, tg_id, col_name = 'test') => {
	logger.info({ tg_id: tg_id }, 'called function update_db');
	const client = new MongoClient(url, { useUnifiedTopology: true });
	logger.info({ tg_id: tg_id }, 'created new mongo client');
	let changes = [];
	try {
		await client.connect();
		const db = client.db(dbName);
		let col = db.collection(col_name);
		logger.info({ tg_id: tg_id }, 'Connected correctly to server');
		if (col == null) {
			await db.createCollection(col_name);
		}
		col = db.collection(col_name);
		logger.debug({ tg_id: tg_id }, 'connect to collection', col_name, 'data length =', data.length);
		for (let i = 0; i < data.length; i++) {
			let el = data[i];
			let str = el['date'];
			logger.info({ tg_id: tg_id }, 'day', i);
			logger.debug({ tg_id: tg_id }, 'current element ', JSON.stringify(el, null, 2), 'date(str) -', str);
			if (typeof str == 'undefined') {
				logger.info({ tg_id: tg_id }, 'element is not a day(it is additonal material)');
				let result = await col.findOne({
					[Object.keys(el)[0]]: { $exists: true }
				});
				logger.debug({ tg_id: tg_id }, 'additional material result', JSON.stringify(result, null, 2));
				if (result == null) {
					await col.insertOne(el);
					//console.log("add to db");
					logger.info({ tg_id: tg_id }, 'add to db');
				} else {
					// console.log(
					//   JSON.stringify(result[Object.keys(el)[0]]),
					//   JSON.stringify(el[Object.keys(el)[0]])
					// );
					if (JSON.stringify(result[Object.keys(el)[0]]) != JSON.stringify(el[Object.keys(el)[0]])) {
						await col.replaceOne({ [Object.keys(el)[0]]: { $exists: true } }, el);
						logger.info({ tg_id: tg_id }, 'replace this data');
						//console.log("not eq, change");
					}
				}
			} else {
				let result = await col.findOne({ date: str });
				logger.debug({ tg_id: tg_id }, 'res after search ob day in db', JSON.stringify(result, null, 2));
				//console.log(result);
				if (result == null) {
					logger.info({ tg_id: tg_id }, 'add this day to db');
					await col.insertOne(el);
					//changes.push([{}, el]);
					//console.log("add to db");
				} else {
					//console.log(str, result)
					//console.log(JSON.stringify(result), JSON.stringify(el), JSON.stringify(result) == JSON.stringify(el));
					if (!objs_are_simple(result, el, tg_id)) {
						//console.log(JSON.stringify(result, null, 4), JSON.stringify(el, null, 4))
						changes.push([ result, el ]);
						await col.replaceOne({ date: str }, el);
						logger.info({ tg_id: tg_id }, "replace this day's data");
						//console.log("not eq, changesssss");
					} else {
						logger.info({ tg_id: tg_id }, 'days are simple');
					}
				}
			}
		}
	} catch (err) {
		console.log(err.stack);
		logger.error({ tg_id: tg_id }, 'error', err.stack);
	} finally {
		await client.close();
		return changes;
	}
};
module.exports.update_db = update_db;
