import { get_html as html } from "./get_html";
import { create_log } from "./logger"
const logger = create_log("html_to_data")
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
let addDays = (date, days, tg_id) => {
	logger.info({ tg_id: tg_id }, 'addDays called');
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	logger.debug({ tg_id: tg_id }, 'start date ', date, 'days =', days, 'result -', result);
	return result;
};
let get_data = async (first_quarter_day, date_now, quarter_ind, id, pupil_link, tg_id) => {
	let struct = [];
	let subjects = new Set();
	//console.log(id);
	let monday = addDays(date_now, 1 - date_now.getDay(), tg_id);
	logger.debug({ tg_id: tg_id }, 'monday =', monday);
	while (true) {
		let date = format_date(monday);
		//console.log(date)
		logger.info({ tg_id: tg_id }, 'get page html');
		let data = await html(
			id,
			`${pupil_link}/dnevnik/quarter/${quarter_ind}/week/${date}`
		);
		// console.log(data)
		if (typeof data != "undefined" && data != null) {
			const dom = new JSDOM(data);
			let tables = dom.window.document.getElementsByTagName('table');
			logger.info({ tg_id: tg_id }, 'tables length ', tables.length);
			//console.log(tables[0].getElementsByClassName("mark_box ")[7].textContent)
			let curr_date = monday;
			for (let i = 0; i < tables.length - 1; i++) {
				logger.info({ tg_id: tg_id }, 'curr day num', i);
				if (addDays(monday, i, tg_id) > first_quarter_day) {
					let fcurr_date = format_date(curr_date);

					let unstruct = {};
					let table = tables[i];
					let lessons = table.getElementsByClassName('lesson ');
					logger.info(`{tg_id=${tg_id}}`, lessons.length - 1, 'lessons');
					for (let l = 1; l < lessons.length; l++) {
						logger.info({ tg_id: tg_id }, 'lesson', l);
						let les = lessons[l].textContent.replace(/\s/g, '').slice(2);
						logger.debug({ tg_id: tg_id }, 'lesson', les);
						if (les != '') {
							let hw = '';
							try {
								hw = lessons[l].parentElement
									.getElementsByClassName('ht-text')[0]
									.textContent.replace(/\n/g, '');
								hw = hw.replace(/  /g, '');
								logger.debug({ tg_id: tg_id }, 'hw', hw);
							} catch (e) {
								//console.log(e)
								logger.error({ tg_id: tg_id }, 'error in getting hw(maybe there is no hw)', e);
							}
							let mark = table.getElementsByClassName('mark_box ')[l - 1].textContent.replace(/\s/g, '');
							logger.debug({ tg_id: tg_id }, 'mark -', mark);
							while (les.indexOf('.') >= 0) {
								logger.debug({ tg_id: tg_id }, 'replace all . in lesson name');
								les = les.replace('.', ' ');
							}
							subjects.add(les)
							if (Object.keys(unstruct).includes(les)) {
								logger.info({ tg_id: tg_id }, 'lesson name is already in use, add space');
								les += ' ';
							}
							unstruct[les] = {};
							unstruct[les]['hw'] = hw;
							unstruct[les]['mark'] = mark == '' ? 0 : parseInt(mark);
							logger.debug({ tg_id: tg_id }, 'structure -', JSON.stringify(unstruct[les], null, 2));
						}
						if (Object.keys(unstruct).length > 0) {
							logger.info({ tg_id: tg_id }, 'unstruct is not empty, add date label');
							unstruct['date'] = fcurr_date;
						}
						//console.log(lessons[l].textContent.replace(/\s/g, ""), hw ,table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, ""))
					}
					if (Object.keys(unstruct).length > 0) {
						logger.info({ tg_id: tg_id }, 'unstruct is not empty, add it to array');
						struct.push(unstruct);
					}
				}
				curr_date = addDays(curr_date, 1, tg_id);
				logger.info({ tg_id: tg_id }, 'change date to', curr_date);
			}
			if (monday <= first_quarter_day) {
				logger.info({ tg_id: tg_id }, 'monday <= last_holidays_day, break from while');
				break;
			}
		}

		monday = addDays(monday, -7, tg_id);
		logger.info({ tg_id: tg_id }, 'change week to', monday);
	}
	struct.push({ last_update: new Date() });
	struct.push({ subjects: Array.from(subjects) })
	return struct;
};

export { get_data };
