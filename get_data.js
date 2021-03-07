let session = require("./get_session_id");
let html = require("./get_html");
//const last_holidays_day = new Date("Mon Jan 11 2021 00:00:00 GMT+0300 (Moscow Standard Time)")
//var fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
let format_date = (c_date) => {
  let date = new Date(c_date)
  let month = monday.getMonth()+1
  month = month < 10 ? "0" +month : month
  date = date.getFullYear() + "-" + month + "-" + date.toDateString().split(" ")[2]
  return date
}
let res  = async (last_holidays_day, date_now) => {
  let struct = []
  let id = await session.login()
  while (id === 0) {
    id = await session.login()
  }
  console.log(id)
  let addDays = (date, days) => {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  monday = addDays(date_now, 1-date_now.getDay())
  while (true){
    let date = format_date(monday)
    //console.log(date)
    let data = await html.html(id, `https://gymn36.schools.by/pupil/1385935/dnevnik/quarter/43/week/${date}`)
    const dom = new JSDOM(data);
    let tables = dom.window.document.getElementsByTagName("table")
    //console.log(tables[0].getElementsByClassName("mark_box ")[7].textContent)
    let curr_date = monday 
    for (let i = 0; i < tables.length - 1; i++){
      if (addDays(monday, i) > last_holidays_day) {
        let fcurr_date = format_date(curr_date)
        let unstruct = {}
        unstruct[fcurr_date] = {}
        let table = tables[i]
        let lessons = table.getElementsByClassName("lesson ")
        for (let l = 1; l < lessons.length; l++){
          let les = lessons[l].textContent.replace(/\s/g, "").slice(2)
          if (les != "") {
            let hw = ""
            try {
              hw = lessons[l].parentElement.getElementsByClassName("ht-text")[0].textContent.replace(/\n/g, "")
              hw = hw.replace(/  /g, "")
            } catch(e) {
              //console.log(e)
            }
            let mark = table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, "")
            while (les.indexOf(".")>=0) {
              les = les.replace(".", " ")
            }
            if (Object.keys(unstruct[fcurr_date]).includes(les)){
              les+=" "
            }
            unstruct[fcurr_date][les] = {}
            unstruct[fcurr_date][les]["hw"] = hw
            unstruct[fcurr_date][les]["mark"] = mark == '' ? 0 : parseInt(mark)
          }
      
          
          //console.log(lessons[l].textContent.replace(/\s/g, ""), hw ,table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, ""))
        }
        struct.push(unstruct)

      }
      curr_date = addDays(curr_date, 1)
  }
  if (monday <= last_holidays_day){
    break
  }
  monday = addDays(monday, -7)
  //console.log("\n\n\n\n")

} 
  session.logout(id)
  //console.log(struct)
  struct["created"] = new Date()
  return struct
}

module.exports.data = res