let creds = require("./creditionals.json");
let request = require("request-promise");

let login = async () => {
  let json = "";
  let err = "";
  let headers = {
    authority: "schools.by",
    "cache-control": "max-age=0",
    "upgrade-insecure-requests": "1",
    origin: "https://schools.by",
    "content-type": "application/x-www-form-urlencoded",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "navigate",
    "sec-fetch-user": "?1",
    "sec-fetch-dest": "document",
    referer: "https://schools.by/login",
    "accept-language": "en-US,en;q=0.9,ru;q=0.8",
    cookie:
      "_ga=GA1.2.1305022743.1610714751; _ym_uid=1610714752271081196; _ym_d=1610714752; _gid=GA1.2.1420376844.1614275897; _ym_isad=2; slc_cookie=%7BslcMakeBetter%7D%7BheaderPopupsIsClosed%7D%7BslcPoll4736%7D; __utma=26264290.1305022743.1610714751.1614523395.1614529221.28; __utmz=26264290.1614529221.28.25.utmcsr=schools.by|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmt=1; _ym_visorc=b; csrftoken=9NH0UsHHrvTUH49VRTWjY3v6xA8ltSUp; PHPSESSID=t2bbtpuk6vg0i5vjbl6ot3immm; _gat_gtag_UA_25047450_3=1; __utmc=26264290; __utmb=26264290.14.9.1614529388726",
  };

  let callback = async (error, response, body) => {
    if (!error) {
      json = response.headers;
    } else {
      console.log("get_session_id callback ", error);
    }
  };

  let dataString = `csrfmiddlewaretoken=${creds.token}&username=${creds.login}&password=${creds.password}`;
  let options = {
    url: "https://schools.by/login",
    method: "POST",
    headers: headers,
    body: dataString,
  };
  try {
    await request(options, callback);
  } catch (e) {
    console.log("planned err");
    //console.log(json)
  }
  if (json != "") {
    return json["set-cookie"][1].split(";")[0].split("=")[1];
  } else {
    return 0;
  }
};

let logout = (sessionID) => {
  var headers = {
    cookie: "sessionid=" + sessionID,
  };

  var options = {
    url: "https://schools.by/logout",
    headers: headers,
  };

  function callback(error, response, body) {
    if (!error) {
      console.log("logout");
    }
  }

  request(options, callback);
};
module.exports.login = login;
module.exports.logout = logout;
