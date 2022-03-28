import fetch from 'node-fetch';
import { create_log } from "./logger"
const logger = create_log("get_html")

let get_html = async (id: string, path: string, n = 0) => {
	logger.info(`called function get_html, path = ${path}`);
	let resp
	try {
		let res = await fetch(path, {
			"headers": {
				"cookie": 'sessionid=' + id
			},
			"method": "GET"
		});
		let statusCode = res.status
		res = await res.text();
		resp = res
		// console.log(res, statusCode) 
		logger.info('Status code: ', statusCode);
		if (statusCode === 404) {
			resp = ''
		}
		logger.info('return responce body');

		return resp;
	} catch (err) {
		console.log("errrr", err)
		logger.error('error during request', `error - ${err}, initeration=${n}`);
		let answ = await get_html(id, path, n + 1)
		return answ
	}
};
export { get_html };