let session = require("./get_session_id");
let res  = async () => {
    id = await session.login()
    console.log(id)
    session.logout(console.log())
}
res()