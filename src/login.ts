import * as request from 'request-promise';

import {create_log} from "./logger"
const logger = create_log("login")

let login = async (creds: object, tg_id: string, token = '9NH0UsHHrvTUH49VRTWjY3v6xA8ltSUp'): Promise<[number, string, string]> => {
	logger.info({ tg_id: tg_id }, 'called loдаin function');
	logger.debug({ tg_id: tg_id }, `username = ${creds["login"]}`);
	let json = '';
	let err = 0; // 0 - everything OK, -1 - access denied
	let headers = {
		authority: 'schools.by',
		'cache-control': 'max-age=0',
		'upgrade-insecure-requests': '1',
		origin: 'https://schools.by',
		'content-type': 'application/x-www-form-urlencoded',
		'user-agent':
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
		accept:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
		'sec-fetch-site': 'same-origin',
		'sec-fetch-mode': 'navigate',
		'sec-fetch-user': '?1',
		'sec-fetch-dest': 'document',
		referer: 'https://schools.by/login',
		'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
		cookie:
			'_ga=GA1.2.1305022743.1610714751; _ym_uid=1610714752271081196; _ym_d=1610714752; _gid=GA1.2.1420376844.1614275897; _ym_isad=2; slc_cookie=%7BslcMakeBetter%7D%7BheaderPopupsIsClosed%7D%7BslcPoll4736%7D; __utma=26264290.1305022743.1610714751.1614523395.1614529221.28; __utmz=26264290.1614529221.28.25.utmcsr=schools.by|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmt=1; _ym_visorc=b; csrftoken=9NH0UsHHrvTUH49VRTWjY3v6xA8ltSUp; PHPSESSID=t2bbtpuk6vg0i5vjbl6ot3immm; _gat_gtag_UA_25047450_3=1; __utmc=26264290; __utmb=26264290.14.9.1614529388726'
	};

	let callback = async (error: string, response: object, body: string) => {
		logger.debug(JSON.stringify(response, null, 2))
		if (typeof response === 'undefined') {
			logger.error({ tg_id: tg_id }, `called login request callback, responce is undefined, body:`, body, "error", error);
			json = ''
			return;
		} else {
			logger.info({ tg_id: tg_id }, `called login request callback, status code `, response["statusCode"]);
			if (![200, 302].includes(response["statusCode"])) {
				logger.error({ tg_id: tg_id}, `login failed`)
				return;
			}
		}
		logger.debug({ tg_id: tg_id }, 'responce', JSON.stringify(response, null, 2));
		if (!error) {
			json = response["headers"];
		} else {
			logger.error({ tg_id: tg_id }, `error in login request callback`, error);
			//console.log("get_session_id callback ", error);
		}
		if (
			body.indexOf(
				'Пожалуйста, введите правильные Логин и пароль. Оба поля могут быть чувствительны к регистру.'
			) > -1 || response["statusCode"] == 403
		) {
			console.log("wrong creds")
			err = -1;
		}
	};

	let dataString = `csrfmiddlewaretoken=${token}&username=${creds["login"]}&password=${creds["password"]}`;
	//console.log(dataString);
	let options = {
		url: 'https://schools.by/login',
		method: 'POST',
		headers: headers,
		body: dataString
	};
	try {
		await request(options, callback);
	} catch (e) {
		logger.error({ tg_id: tg_id }, ' error ', e);
	}
	if (json != '' && err !== -1) {
		logger.info({ tg_id: tg_id }, 'start parsering json to get session ID');
		try {
			let sessionid: string = json['set-cookie'][1].split(';')[0].split('=')[1];
			let id: string = json['location']
			if (typeof id == "undefined") {
				return [ 1, "", "" ];
			}
			logger.info({ tg_id: tg_id }, 'json parsed successfully');
			return [ 0, sessionid, id ];
		} catch (e) {
			logger.error({ tg_id: tg_id }, 'error in parsering resp json ', e);
			return [ 1, "", "" ];
		}
	} else {
		if (err === -1) {
			logger.warn({ tg_id: tg_id }, 'access denied');
			return [-1, "", ""];
		}
		logger.warn({ tg_id: tg_id }, 'json is empty(, return 0');
		return [1, "", ""];
	}
};

let logout = (sessionID: string, tg_id: string, n = 0) => {
	logger.info(`called logout func {tg_id=${tg_id}}`);
	var headers = {
		cookie: 'sessionid=' + sessionID
	};

	var options = {
		url: 'https://schools.by/logout',
		headers: headers
	};

	function callback(error: string, response: object, body: string) {
		if (typeof response == 'undefined'){
			logger.info({ tg_id: tg_id }, 'called logout request callback, responce is undefined, error', error);
			return;
		}
		logger.info({ tg_id: tg_id }, 'called logout request callback, responce status code = ', response["statusCode"]);
		if (!error) {
			console.log('logout');
			logger.info({ tg_id: tg_id }, 'logout');
		} else {
			logger.error({ tg_id: tg_id }, ` error in logout request callback`, error);
		}
	}
	try {
		request(options, callback);
	} catch (err) {
		logger.error(`error in logout request: ${err}\niteration=${n}`)
		logout(sessionID, tg_id, n + 1)
	}
	
};
export {login, logout}
