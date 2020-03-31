const client = require('prom-client');
const express = require('express');
const server = express();
const register = new client.Registry();

client.collectDefaultMetrics({prefix: 'node_', timeout: 5000, register});
 
const endpoint = process.env.EMQX_ENDPOINT; 
const user = process.env.USERNAME;
const pass = process.env.PASSWORD;
const port = process.env.PORT;
const gaugeList = [];
var nodeMetrics = [];
const values = [];

server.get('/metrics', (req, res) => {
   queryMetrics()
   .then(data =>{
      var jsonObject = JSON.parse(data);
      var metrics = [];
      const regex = /\./g;
      var nodesCount = jsonObject.data.length;
      
      for (let i=0; i<nodesCount; i++){      
         nodeMetrics[i] = jsonObject.data[i].metrics;        
      }
      var keys = Object.keys(nodeMetrics[0]);
      var adder = new Array(keys.length).fill(0);
      for (let i=0; i<nodesCount; i++){      
         values[i] = Object.values(nodeMetrics[i]);       
      }
      for (let i=0; i<keys.length; i++){              
         metrics[i] = keys[i].replace(regex, '_');
      }
      for (let i=0; i<values.length; i ++) 
      var adder = adder.map(function (num, idx) {      
             return num + parseInt(values[i][idx]);           
      });

      for (let i=0; i < keys.length; i++){
         gaugeList[i].set(adder[i]);
      }
   }).then((data)=> {
      res.set('Content-Type', register.contentType);
      res.end(register.metrics());
   }).catch((error) => {
      console.log("Error:: ", error);
   });
});

function queryMetrics() {
   var username = `${user}` , password = `${pass}` , auth = "Basic " + Buffer.from(username + ":" + password).toString("base64");
   var request = require('request');
   var url = `${endpoint}/api/v3/metrics/`;

   const options = {
       url : url,
       headers : {
           "Authorization" : auth
       }
   }
   return new Promise((resolve, reject) => {
       request.get( options, function(error, response, body) {
          if (!error && response.statusCode == 200) {
             resolve(body);
          }
          else if (response === undefined) {
             console.log("Error in http request!");
          }
       })
   });
}

function registerMetric() {
   return queryMetrics()
   .then(data =>{
      var jsonObject = JSON.parse(data);
      var metrics = [];
      const regex = /\./g;
      var nodesCount = jsonObject.data.length;

      for (let i=0; i<nodesCount; i++){      
         nodeMetrics[i] = jsonObject.data[i].metrics;        
      }
      var keys = Object.keys(nodeMetrics[0]) ;
      var adder = new Array(keys.length).fill(0);
      for (let i=0; i<nodesCount; i++){      
         values[i] = Object.values(nodeMetrics[i]);       
      }
      for (let i=0; i<keys.length; i++){              
         metrics[i] = keys[i].replace(regex, '_');
      }  
      for (let i=0; i<values.length; i ++) 
         adder = adder.map(function (num, idx) {      
             return num + parseInt(values[i][idx]);           
      });

      for (let i=0; i < keys.length; i++){
         gaugeList[i] = new client.Gauge({
            name: "node_"+ metrics[i] + "_metric_guage",
            help: metrics[i]
         });
         register.registerMetric(gaugeList[i]);
         gaugeList[i].set(adder[i]);
      }
   })
}

registerMetric();

console.log('Server listening to ' + `${port}` + ', metrics exposed on /metrics endpoint');
server.listen(`${port}`); 