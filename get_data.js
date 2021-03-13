let session = require("./get_session_id");
let html = require("./get_html");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let format_date = (c_date) => {
  let date = new Date(c_date);
  let month = monday.getMonth() + 1;
  month = month < 10 ? "0" + month : month;
  date =
    date.getFullYear() + "-" + month + "-" + date.toDateString().split(" ")[2];
  return date;
};

let res = async (last_holidays_day, date_now, quarter_ind) => {
  let all_dates = []
  let struct = [];
  let id = await session.login();
  while (id === 0) {
    id = await session.login();
  }
  console.log(id);
  let addDays = (date, days) => {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  monday = addDays(date_now, 1 - date_now.getDay());
  while (true) {
    let date = format_date(monday);
    //console.log(date)
    let data = await html.html(
      id,
      `https://gymn36.schools.by/pupil/1385935/dnevnik/quarter/${quarter_ind}/week/${date}`
    );
    const dom = new JSDOM(data);
    let tables = dom.window.document.getElementsByTagName("table");
    //console.log(tables[0].getElementsByClassName("mark_box ")[7].textContent)
    let curr_date = monday;
    for (let i = 0; i < tables.length - 1; i++) {
      if (addDays(monday, i) > last_holidays_day) {
        let fcurr_date = format_date(curr_date);
        
        let unstruct = {};
        let table = tables[i];
        let lessons = table.getElementsByClassName("lesson ");
        for (let l = 1; l < lessons.length; l++) {
          let les = lessons[l].textContent.replace(/\s/g, "").slice(2);
          if (les != "") {
            let hw = "";
            try {
              hw = lessons[l].parentElement
                .getElementsByClassName("ht-text")[0]
                .textContent.replace(/\n/g, "");
              hw = hw.replace(/  /g, "");
            } catch (e) {
              //console.log(e)
            }
            let mark = table.getElementsByClassName("mark_box ")[l - 1].textContent.replace(/\s/g, "");
            while (les.indexOf(".") >= 0) {
              les = les.replace(".", " ");
            }
            if (Object.keys(unstruct).includes(les)) {
              les += " ";
            }
            unstruct[les] = {};
            unstruct[les]["hw"] = hw;
            unstruct[les]["mark"] = mark == "" ? 0 : parseInt(mark);
            
          }
          if (Object.keys(unstruct).length > 0) {
            unstruct["date"] = fcurr_date 
          }
          //console.log(lessons[l].textContent.replace(/\s/g, ""), hw ,table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, ""))
        }
        if (Object.keys(unstruct).length > 0) {
          struct.push(unstruct); 
          all_dates.push(fcurr_date)
        }
      }
      curr_date = addDays(curr_date, 1);
    }
    if (monday <= last_holidays_day) {
      
      break;
    }
    monday = addDays(monday, -7);
  }
  session.logout(id);
  struct.push({"last_update": new Date()})
  struct.push({"all_dates": all_dates})
  return struct;
};

module.exports.data = res;
