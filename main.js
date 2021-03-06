let session = require("./get_session_id");
let html = require("./get_html");

var fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

let res  = async () => {
    id = await session.login()
    console.log(id)
    date = "2021-02-08"
    data = await html.html(id, `https://gymn36.schools.by/pupil/1385935/dnevnik/quarter/43/week/${date}`)
    const dom = new JSDOM(data);
    tables = dom.window.document.getElementsByTagName("table")
    //console.log(tables[0].getElementsByClassName("mark_box ")[7].textContent)
    for (let i = 0; i < tables.length - 1; i++){
      table = tables[i]
      lessons = table.getElementsByClassName("lesson ")
      console.log("\n", lessons[0].textContent.replace(/\n/g, ""))
      //console.log(lessons[5].parentElement.getElementsByClassName("ht-text")[0].textContent.replace(/\s/g, ""))
      for (let l = 1; l < lessons.length; l++){
        let hw = ""
        try {
          hw = lessons[l].parentElement.getElementsByClassName("ht-text")[0].textContent.replace(/\n/g, "")
          hw = hw.replace(/  /g, "")
        } catch(e) {
          //console.log(e)
        }
        console.log(lessons[l].textContent.replace(/\s/g, ""), hw ,table.getElementsByClassName("mark_box ")[l-1].textContent.replace(/\s/g, ""))
    }}

    fs.writeFile('res1.html', data,  (err) => {
        if (err) throw err;
        console.log('Saved!');
      });
    session.logout(id)
}   

res()