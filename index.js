const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
var request = require("request");
const axios = require("axios");
var mysql = require('mysql');
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

const ids=[];

io.on("connection", (socket) => {
  console.log("client connected: ", socket.id);
  if (interval) {
    clearInterval(interval);
  }
  setInterval(() => getApiAndEmit(socket), 10000);
  socket.on("disconnect", (reason) => {
    console.log("client disconnected",reason);
  });
});

var con;
var connectionPool = mysql.createPool({ 
  host: "173.214.168.54",
  user: "bustadmin_dbadm",
  password: ";,bp~AcEX,*a",
  database:"bustadmin_paydb",
  connectionLimit: 100000000
}); 

const getApiAndEmit = (socket) => {
  try{
    connectionPool.getConnection(function(err, connection) {
      if (err) throw err;
      con = connection;
      con.query(`SELECT * FROM transaction WHERE processed=0 `, (err, result) => {
        if (err) throw err;
        Object.keys(result).forEach(async (key)=> { 
          var row = result[key];
          const transaction= await Transaction.findOne({trans_id:row.trans_id})
          console.log(transaction);
          if(!transaction){
            con.query(`UPDATE transaction SET processed = 1 WHERE trans_id = "${row.trans_id}"`,function(err,result){
              if(err) throw err;
              // con.end();
              return con.release()
            })
            const trans= new Transaction({
              type:"Deposit",
              trans_id:row.trans_id,
              bill_ref_number:row.bill_ref_number,
              trans_time:row.trans_time,
              amount:row.trans_amount,
              phone: row.bill_ref_number,
              floatBalance:row.org_balance
            })

            await trans.save().then(async(item)=>{
              try{
                const account = await Account.findOne({ phone:row.bill_ref_number});
                account.balance=parseFloat(+account?.balance) + parseFloat(+row.trans_amount)
                await account.save()
                console.log(account);
                const response = {
                  deposited: true,
                  trans_id:row.trans_id
                };
                io.sockets.emit("FromAPI2", response);
              }catch(err){
                console.log(err)
              }
            })
          }else{
            const response = {deposited: false};                          
            io.sockets.emit("FromAPI2", response);
            return con.release()
          }
        });
      });
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

  //git push https://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@github.com/Trisonweru/checker.git


//   con.query(`UPDATE transaction SET processed = 1 WHERE trans_id = "${row.trans_id}"`,function(err,result){
//     if(err) throw err;
//      con.end();
//   })
// const trans= new Transaction({
//           type:"Deposit",
//           trans_id:row.trans_id,
//           bill_ref_number:row.bill_ref_number,
//           trans_time:row.trans_time,
//           amount:row.trans_amount,
//           phone: row.bill_ref_number,
//           floatBalance:row.org_balance
//     })

// await trans.save().then(async(item)=>{
//   try{

//   const account = await Account.findOne({ phone:row.bill_ref_number});
//   account.balance=parseFloat(+account?.balance) + parseFloat(+row.trans_amount)
//   await account.save()
//   console.log(account);
//   const response = {
//             deposited: true,
//             trans_id:row.trans_id
//           };
//   io.sockets.emit("FromAPI2", response);
//   }catch(err){
//     console.log(err)
//   }
// })
