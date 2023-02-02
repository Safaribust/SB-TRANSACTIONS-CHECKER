
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const request = require("request");
const axios = require("axios");
var mysql = require('mysql2');
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/users");
const Account = require("./models/account");
const Transaction = require("./models/transactions");
const Logs = require("./models/logs");

const app = express();

const server = http.createServer(app);
let interval;

const io = socketIo(server, {
cors: {
origin: ['http://localhost:3000', 'https://crash.safaribust.co.ke', "https://safaribust.co.ke",'*'],
},
});
const ids = [];

io.on("connection", (socket) => {
console.log("client connected: ", socket.id);
if (interval) {
clearInterval(interval);
}
interval = setInterval(() => getApiAndEmit(socket), 5000);
socket.on("disconnect", (reason) => {
clearInterval(interval);
});
});

const getApiAndEmit = (socket) => {
let con;
try {
con = mysql.createPool({
host: "173.214.168.54",
user: "bustadmin_dbadm",
password: ";,bp~AcEX,*a",
database: "bustadmin_paydb",
connectionLimit: 1
});
con.getConnection(async function (err, connection) {
if (err) throw err;
connection.query(`SELECT * FROM transaction WHERE processed=0`, async function (err, result) {
if (err) throw err;
Object.keys(result).forEach(async function (key) {
var row = result[key];
const transaction = await Transaction.findOne({ trans_id: row.trans_id });
if (transaction) {
const response = { deposited: false };
io.sockets.emit("FromAPI2", response);
connection.release();
return;
}
connection.query(`UPDATE transaction SET processed = 1 WHERE trans_id = "${row.trans_id}"`, function (err, result) {
if (err) throw err;
connection.release();
});
const trans = new Transaction({
type: "Deposit",
trans_id: row.trans_id,
bill_ref_number: row.bill_ref_number,
trans_time: row.trans_time,
amount: row.trans_amount,
phone: row.bill_ref_number,
floatBalance: row.org_balance
});


await trans.save().then(async(item)=>{
  try{

  const account = await Account.findOne({ phone:row.bill_ref_number});
  account.balance=parseFloat(+account?.balance) + parseFloat(+row.trans_amount)
  await account.save().catch(err => {
    console.log(err)
    throw err;
  });
  const response = {
            deposited: true,
            trans_id:row.trans_id
          };
  io.sockets.emit("FromAPI2", response);
  }catch(err){
    console.log(err)
  }
})

});
})

});
// return con.end(()=>console.log("connection closed"))
}catch(err){
console.log(err)
}
};
const MONGO_URI =  "mongodb+srv://Safaribust:safaribust@cluster0.yuiecha.mongodb.net/?retryWrites=true&w=majority";    
const PORT = process.env.PORT || 8050;
mongoose
.connect(`${MONGO_URI}`,{
useNewUrlParser: true,
useUnifiedTopology: true 
})
.then(() => {
server.listen(PORT, () => {
console.log(`Server is running at http://localhost:${PORT}`);
});
})
.catch((err) => {
console.log(err);
});
