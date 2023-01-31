const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
var request = require("request");
const axios = require("axios");
var mysql = require('mysql');
const { Pool } = require('mysql2');
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
origin: ["http://localhost:3000","https://crash.safaribust.co.ke","*"],
},
});

const ids=[];

io.on("connection", (socket) => {
console.log("client connected: ", socket.id);
if (interval) {
clearInterval(interval);
}
setInterval(() => getApiAndEmit(socket), 50000);
socket.on("disconnect", (reason) => {
console.log("client disconnected", reason);
});
});
var pool;
function conPooler=()=>{
  if(!pool){
   pool = new Pool({
host: "173.214.168.54",
user: "bustadmin_dbadm",
password: ";,bp~AcEX,*a",
database: "bustadmin_paydb",
connectionLimit: 10
});
  }
  return pool
}

const pooler=conPooler()
const getApiAndEmit = (socket) => {
pooler.getConnection(function (err, connection) {
if (err) throw err;
connection.query(SELECT * FROM transaction WHERE processed=0 , function (err, result) {
if (err) throw err;
Object.keys(result).forEach(async function (key) {
var row = result[key];
const transaction = await Transaction.findOne({ trans_id: row.trans_id });
if (transaction) {
console.log("no new transactions");
const response = { deposited: false };
io.sockets.emit("FromAPI2", response);
connection.release();
return
} else {
connection.query(UPDATE transaction SET processed = 1 WHERE trans_id = "${row.trans_id}", function (err, result) {
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
                  await account.save()
                  const response = {
                            deposited: true,
                            trans_id:row.trans_id
                          };
                  io.sockets.emit("FromAPI2", response);
                    
                  }catch(err){
                    console.log(err)
                  }
               })
                 }
              
           
              });
         })
         
     });

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


