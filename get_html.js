let request = require('request-promise');
const logger = require('./logger')('get html');
let get_html = async (id, path) => {
	logger.info(`called function get_html, path = ${path}`);
	let headers = {
		cookie: 'sessionid=' + id
	};
	let resp = 0;
	let options = {
		url: path,
		headers: headers
	};
	let callback = (error, res, body) => {
		logger.info('called request callback, response status code ', res.statusCode);
		if (!error) {
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
module.exports.html = get_html;
