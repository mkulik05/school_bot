import fetch from 'node-fetch';
import { get_html } from "./get_html";
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
import { create_log } from "./logger"
const logger = create_log("get_quarter_info")

let addDays = (date, days, tg_id) => {
	logger.info({ tg_id: tg_id }, 'addDays called');
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	logger.debug({ tg_id: tg_id }, 'start date ', date, 'days =', days, 'result -', result);
	return result;
};

let format_date = (c_date) => {
	logger.info('function format_date called');
	logger.debug('c_date =', c_date);
	let date = new Date(c_date);
	let month = date.getMonth() + 1;
	let res = month < 10 ? '0' + month : month;
	let fin_res = date.getFullYear() + '-' + res + '-' + date.toDateString().split(' ')[2];
	logger.debug('final res =', date);
	return fin_res;
};

let get_current_quarter_id = async (session_id: string, st_path: string, n = 0) => {
	logger.info(`called function get_current_quarter_id, path = ${st_path}`);
	try {
		// console.log(spath)
		let res = await fetch(st_path + '/dnevnik', {
			"headers": {
				"cookie": 'sessionid=' + session_id
			},
			"method": "GET"
		});
		let statusCode = res.status
		res = await res.text();
		if (res !== undefined) {
			const dom = new JSDOM(res);
			let curr = dom.window.document.getElementsByClassName('current')[0]
			let link = curr.getAttribute('src')
			let id = link.slice(link.lastIndexOf('/') + 1)
			console.log(id)
			return parseInt(id)
		}

	} catch (err) {
		console.log("errrr", err)
		logger.error('error during request', `error - ${err}, initeration=${n}`);
		let answ = await get_current_quarter_id(session_id, st_path, n + 1)
		return answ
	}
};

let get_quarter_borders = async (session_id, pupil_link, quater_id, tg_id, max_weeks_range = 20) => {
	let date_now = new Date();
	let monday = addDays(date_now, 1 - date_now.getDay(), tg_id);
	let first_quarter_day = '';
	let last_quarter_day = '';
	let i = -max_weeks_range
	while (i < max_weeks_range) {
		let date_obj = addDays(monday, 7 * i, tg_id);
		let date = format_date(date_obj)
		let html = await get_html(
			session_id,
			`${pupil_link}/dnevnik/quarter/${quater_id}/week/${date}`
		);
		if (!(html.indexOf("Выход за границы четверти") > -1)) {
			if (first_quarter_day === '') {
				first_quarter_day = date
			}
			last_quarter_day = date
		}
		i += 1
	}
	let correct_first_quarter_day = addDays(new Date(first_quarter_day), -1, tg_id)
	first_quarter_day = format_date(correct_first_quarter_day)
	let correct_last_quarter_day = addDays(new Date(last_quarter_day), 6, tg_id)
	last_quarter_day = format_date(correct_last_quarter_day)
	return { start: first_quarter_day, end: last_quarter_day }

}


export { get_current_quarter_id, get_quarter_borders };