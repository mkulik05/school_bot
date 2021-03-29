let request = require('request-promise');
const logger = require('./logger')('login');
let login = async (creds, tg_id, token = '9NH0UsHHrvTUH49VRTWjY3v6xA8ltSUp') => {
	logger.info({ tg_id: tg_id }, 'called login function');
	logger.debug({ tg_id: tg_id }, `username = ${creds.login}`);
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

	let callback = async (error, response, body) => {
    if (typeof response === 'undefined') {
      logger.error({ tg_id: tg_id }, `called login request callback, responce is undefined, body:`, body);
      return;
    } else {
      logger.info({ tg_id: tg_id }, `called login request callback, status code `, response.statusCode);
    }
		logger.debug({ tg_id: tg_id }, 'responce', JSON.stringify(response, null, 2));
		if (!error) {
			json = response.headers;
		} else {
			logger.error({ tg_id: tg_id }, `error in login request callback`, error);
			//console.log("get_session_id callback ", error);
		}
		if (
			response.body.indexOf(
				'Пожалуйста, введите правильные Логин и пароль. Оба поля могут быть чувствительны к регистру.'
			) > -1
		) {
			err = -1;
		}
	};

	let dataString = `csrfmiddlewaretoken=${token}&username=${creds.login}&password=${creds.password}`;
	let options = {
		url: 'https://schools.by/login',
		method: 'POST',
		headers: headers,
		body: dataString
	};
	try {
		await request(options, callback);
	} catch (e) {
		//console.log("planned err");
		//console.log(json)
		logger.error({ tg_id: tg_id }, ' error ', e);
	}
	if (json != '' && err != -1) {
		logger.info({ tg_id: tg_id }, 'start parsering json to get session ID');
		try {
			let sessionid = json['set-cookie'][1].split(';')[0].split('=')[1];
			let id = json['location'].split('/');
			id = id[id.length - 1];
			logger.info({ tg_id: tg_id }, 'json parsed successfully');
			return [ sessionid, id ];
		} catch (e) {
			logger.error({ tg_id: tg_id }, 'error in parsering resp json ', e);
		}
	} else {
		if ((err == -1)) {
			logger.warn({ tg_id: tg_id }, 'access denied');
			return -1;
		}
		logger.warn({ tg_id: tg_id }, 'json is empty(, return 0');
		return 0;
	}
};

let logout = (sessionID, tg_id) => {
	logger.info(`called logout func {tg_id=${tg_id}}`);
	var headers = {
		cookie: 'sessionid=' + sessionID
	};

	var options = {
		url: 'https://schools.by/logout',
		headers: headers
	};

	function callback(error, response, body) {
		logger.info({ tg_id: tg_id }, 'called logout request callback, responce status code = ', response.statusCode);
		if (!error) {
			console.log('logout');
			logger.info({ tg_id: tg_id }, 'logout');
		} else {
			logger.error({ tg_id: tg_id }, ` error in logout request callback`, error);
		}
	}

	request(options, callback);
};
module.exports.login = login;
module.exports.logout = logout;
