var hexUtils = require('./hexUtils'),
 btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort(),
 express = require('express'),
 http = require('http'),
 qs = require('qs'),
 ws = require('ws');

var util = require('util');
util.print("\u001b[2J\u001b[0;0H");

console.log('                                                                                              ');
console.log('                                                                                              ');
console.log('                                                                                              ');     
console.log('$$$$$$$$\\ $$\\    $$\\  $$$$$$\\                              $$\\      $$\\ $$\\     $$\\  $$$$$$\\  ');
console.log('$$  _____|$$ |   $$ |$$ ___$$\\                             $$$\\    $$$ |\\$$\\   $$  |$$  __$$\\ ');
console.log('$$ |      $$ |   $$ |\\_/   $$ |                            $$$$\\  $$$$ | \\$$\\ $$  / $$ /  $$ |');
console.log('$$$$$\\    \\$$\\  $$  |  $$$$$ /       $$$$$$\\ $$$$$$\\       $$\\$$\\$$ $$ |  \\$$$$  /  $$ |  $$ |');
console.log('$$  __|    \\$$\\$$  /   \\___$$\\       \\______|\\______|      $$ \\$$$  $$ |   \\$$  /   $$ |  $$ |');
console.log('$$ |        \\$$$  /  $$\\   $$ |                            $$ |\\$  /$$ |    $$ |    $$ |  $$ |');
console.log('$$$$$$$$\\    \\$  /   \\$$$$$$  |                            $$ | \\_/ $$ |    $$ |     $$$$$$  |');
console.log('\\________|    \\_/     \\______/                             \\__|     \\__|    \\__|     \\______/ ');
console.log('                                                                                              ');
console.log('                                                                                              ');
console.log('                                                                                              ');     
console.log('-------------Credits to JefBibomed : DevFest Nantes 2014');
console.log(__dirname);
console.log(process.cwd());

///////////////////////////////////
///////////////////////////////////
///////////////////////////////////
//Global Vars
///////////////////////////////////
///////////////////////////////////
///////////////////////////////////

var lastGesture = null,
  ev3BirckName = 'EV3_ADN-03';

///////////////////////////////////
///////////////////////////////////
// Server part
///////////////////////////////////
///////////////////////////////////

var app = express()
  //.use(express.logger('dev'))
  .use(express.static('public'))
  .use(function(req, res){
    if (req.query.gesture){
    	if (lastGesture != req.query.gesture){
    		lastGesture = req.query.gesture;
    		console.log(req.query.gesture);
    		wss.broadcast({
    			gesture : req.query.gesture
    		});
    	}
    }else if (req.query.json){
      var dataJson = JSON.parse(req.query.json);
      if(dataJson.pose != 'rest' && dataJson.pose != lastGesture){
        lastGesture = dataJson.pose;
        ev3SendMessage('myo',dataJson.pose);
      }
      wss.broadcast(dataJson);
    }
    res.end('hello world\n'+req.query.test);
  });

http.createServer(app).listen(8090);
console.log('-------------------------------');
console.log('Start Http server on port : '+8090);

var WebSocketServer = ws.Server
  , wss = new WebSocketServer({port: 8080});

console.log('-------------------------------');
console.log('Start WebSocket server on port : '+8080);
wss.on('expression', function(ws) {
    ws.on('message', function(message) {
        console.log('WS->received: %s', message);
        wss.broadcast(message);
    });
    //ws.send('something');
});

// Overwrite Broadcast
wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(JSON.stringify(data));
};


///////////////////////////////////
///////////////////////////////////
// Bluetooth Config
///////////////////////////////////
///////////////////////////////////



btSerial.on('found', function(address, name) {
    console.log('BLE->Found device ' + address + ' with name ' + name);
    if (name === ev3BirckName){
      btSerial.findSerialPortChannel(address, function(channel) {
          console.log("BLE->Adress : "+address+" With Channel : "+channel);
          
          btSerial.connect(address, channel, function() {
              console.log('BLE->Connected to brick : '+ev3BirckName);

              ev3SendMessage('connect','ok');
            
              btSerial.on('data', function(buffer) {
                  console.log("BLE->Datas received : ");
                  console.log(buffer);
                  console.log(buffer.toString('hex'));                  
              });
          }, function (err) {
              console.log('BLE->cannot connect');
              console.log(err);
              console.log(err.stack);
          });

          // close the connection when you're ready
          btSerial.close();
      }, function(){
        console.log('BLE->no Channel found');
      });
    }

});

// Catch errors
btSerial.on('failure', function(err) {
  console.log('BLE->Failure');
  console.log(err);
  console.log(err.stack);
});

console.log('-------------------------------');
console.log('Start Connection to blueTooth');
btSerial.inquire();


function ev3SendMessage(type,message){
  if (btSerial.isOpen()){
    console.log('BLE-> Try to write : '+type+' | with message : '+message+" | : "+hexUtils.toEV3(type,message));
    var buffer = new Buffer(hexUtils.toEV3(type, message), 'hex');
    btSerial.write(buffer, function(err, bytesWritten) {
      if (err) console.log(err);
      else console.log('BLE->datas write');
    });

  }else{
    console.log('BLE->Cannot send message because blueTooth is off');
  }
}
