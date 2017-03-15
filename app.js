var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
app.use(bodyParser.json());

var options = {
  key: fs.readFileSync('sslcert/private.key'),
  cert: fs.readFileSync('sslcert/certificate.pem')
};

var server = https.createServer(options, app);
// Pass a http.Server instance to the listen method
var io = require('socket.io').listen(server);

// The server should start listening
server.listen(process.env.PORT || 3000);

var messageHandler = function(msg){
  console.log('message: ' + msg);

  io.emit('server-message', "received : "+msg);
}

var connectionHandler = function(socket){

  console.log('user connected');

  io.emit('fb-message', '{"text":"this is cool yo!!"}');

  socket.on('pi-message', messageHandler);
}

io.on('connection', connectionHandler);

app.get('/testUrl', function(req, res){
  res.send('URL get works fine');
});

app.post('/testUrl', function(req, res){
  io.emit('fb-message', req.body);
});

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'this_is_a_shit_storm') {// token verifying
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.post('/webhook', function (req, res) {

  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  io.emit('fb-message', JSON.stringify(message));


}
