let html = require("./get_html");
const logger = require("./logger")("html to data")
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let format_date = (c_date) => {
  logger.info("function format_date called")
  logger.debug("c_date =", c_date)
  let date = new Date(c_date);
  let month = monday.getMonth() + 1;
  month = month < 10 ? "0" + month : month;
  date =
    date.getFullYear() + "-" + month + "-" + date.toDateString().split(" ")[2];
  logger.debug("final res =", date)
  return date;
};

let res = async (last_holidays_day, date_now, quarter_ind, id, pupil_id, tg_id) => {
  let all_dates = []
  let struct = [];
  //console.log(id);
  let addDays = (date, days) => {
    logger.info({tg_id:tg_id}, "addDays called")
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    logger.debug({tg_id:tg_id}, "start date ", date, "days =", days, "result -", result)
    return result;
  };
  monday = addDays(date_now, 1 - date_now.getDay());
  logger.debug({tg_id:tg_id}, "monday =", monday)
  while (true) {
    let date = format_date(monday);
    //console.log(date)
    logger.info({tg_id:tg_id}, "get page html")
    let data = await html.html(
      id,
      `https://gymn36.schools.by/pupil/${pupil_id}/dnevnik/quarter/${quarter_ind}/week/${date}`
    );
    const dom = new JSDOM(data);
    let tables = dom.window.document.getElementsByTagName("table");
    logger.info({tg_id:tg_id}, "tables length ", tables.length)
    //console.log(tables[0].getElementsByClassName("mark_box ")[7].textContent)
    let curr_date = monday;
    for (let i = 0; i < tables.length - 1; i++) {
      logger.info({tg_id:tg_id}, "curr day num", i)
      if (addDays(monday, i) > last_holidays_day) {
        let fcurr_date = format_date(curr_date);
        
        let unstruct = {};
        let table = tables[i];
        let lessons = table.getElementsByClassName("lesson ");
        logger.info(`{tg_id=${tg_id}}`, lessons.length-1, "lessons")
        for (let l = 1; l < lessons.length; l++) {
          logger.info({tg_id:tg_id}, "lesson", l)
          let les = lessons[l].textContent.replace(/\s/g, "").slice(2);
          logger.debug({tg_id:tg_id}, "lesson", les)
          if (les != "") {
            let hw = "";
            try {
              hw = lessons[l].parentElement
                .getElementsByClassName("ht-text")[0]
                .textContent.replace(/\n/g, "");
              hw = hw.replace(/  /g, "");
              logger.debug({tg_id:tg_id}, "hw", hw)
            } catch (e) {
              //console.log(e)
              logger.error({tg_id:tg_id}, "error in getting hw(maybe there is no hw)", e)
            }
            let mark = table.getElementsByClassName("mark_box ")[l - 1].textContent.replace(/\s/g, "");
            logger.debug({tg_id:tg_id}, "mark -", mark)
            while (les.indexOf(".") >= 0) {
              logger.debug({tg_id:tg_id}, "replace all . in lesson name")
              les = les.replace(".", " ");
            }
            if (Object.keys(unstruct).includes(les)) {
              logger.info({tg_id:tg_id}, "lesson name is already in use, add space")
              les += " ";
            }
            unstruct[les] = {};
            unstruct[les]["hw"] = hw;
            unstruct[les]["mark"] = mark == "" ? 0 : parseInt(mark);
            logger.debug({tg_id:tg_id}, "structure -", JSON.stringify(unstruct[les], null, 2))
          }
          if (Object.keys(unstruct).length > 0) {
            logger.info({tg_id:tg_id}, "unstruct is not empty, add date label")
            unstruct["date"] = fcurr_date 
          }
          //console.log(lessons[l].textContent.replace(/\s/g, ""), hw ,table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, ""))
        }
        if (Object.keys(unstruct).length > 0) {
          logger.info({tg_id:tg_id}, "unstruct is not empty, add it to array")
          struct.push(unstruct); 
          all_dates.push(fcurr_date)
        }
      }
      curr_date = addDays(curr_date, 1);
      logger.info({tg_id:tg_id}, "change date to", curr_date)
    }
    if (monday <= last_holidays_day) {
      logger.info({tg_id:tg_id},"monday <= last_holidays_day, break from while")
      break;
    }
    monday = addDays(monday, -7);
    logger.info({tg_id:tg_id}, "change week to", monday)
  }
  struct.push({"last_update": new Date()})
  struct.push({"all_dates": all_dates})
  return struct;
};

module.exports = res;
