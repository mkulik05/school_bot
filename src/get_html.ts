import * as request from 'request-promise';
import {create_log} from "./logger"
const logger = create_log("get_html")
let get_html = async (id: string, path: string) => {
	logger.info(`called function get_html, path = ${path}`);
	let headers = {
		cookie: 'sessionid=' + id
	};
	let resp = "";
	let options = {
		url: path,
		headers: headers
	};
	let callback = (error, res: object, body: string) => {
		if (typeof res == "undefined") {
			logger.error('called request callback, response is undefined, body', body, "error -", error);
			return;
		}
		logger.info('called request callback, response status code ', res['statusCode']);
		if (!error && res['statusCode'] !== 404) {
			logger.debug("error -", error, res['statusCode'] !== 404);
			resp = body;
		} else {
			logger.error(`error in request callback: ${error}`);
		}
	};

	await request(options, callback);
	id = '';
	logger.info('return responce body');
	return resp;
};
export {get_html};