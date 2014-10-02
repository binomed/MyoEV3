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
  ev3BirckName = 'EV3_ADN-03',
  speed = 0,
  timeStart = -1,
  refYaw = null,
  lastMove = 'stop';
  start = false;

///////////////////////////////////
///////////////////////////////////
// Server part
///////////////////////////////////
///////////////////////////////////

var app = express()
  //.use(express.logger('dev'))
  .use(express.static('public'))
  .use(function(req, res){
    if (req.query.json){
      var dataJson = JSON.parse(req.query.json);
      if (!refYaw){
        refYaw = dataJson.yaw;
      }
      if(dataJson.pose != 'rest' && dataJson.pose != lastGesture){
        console.log(dataJson);
        lastGesture = dataJson.pose;
        console.log(lastGesture);
        if (dataJson.pose === 'fist'){
          ev3SendMessage('myo','fire');
          setTimeout(function() {
            lastGesture = null;
            ev3SendMessage('myo','stop');
          }, 500);
          /*if (timeStart == -1){
            ev3SendMessage('myomove','start');
            timeStart = new Date().getTime();
            start = true;
          }else if (new Date().getTime() - timeStart > 1000){
            ev3SendMessage('myomove','stop');
            timeStart = -1;
            start = false;
          }*/
        }else if (dataJson.pose === 'thumbToPinky'){
          //ev3SendMessage('myo','down');
        }else if (dataJson.pose === 'waveOut'){
          //ev3SendMessage('myo','left');
        }else if (dataJson.pose === 'waveIn'){
          //ev3SendMessage('myo','right');
        }else if (dataJson.pose === 'fingersSpread'){
          //ev3SendMessage('myo','stop');
        }
        //ev3SendMessage('myo',dataJson.pose);
      }else if( dataJson.pose === 'rest'){
        // Tenir compte du Pitch vers -1.5 == on leve le bras / 1.5 == on baisse le bras
        // roll = rotation autour de X
        // Pitch = rotation autour de Y
        // yaw = rotation autour de Z de -3.13 à 3.13

        //          ------------------
        //        /                 /
        //       /       ^ z       /
        //      /        |        /
        //     /         ,-->y   /
        //    /         /       /
        //   /         x       /
        //  /                 /
        // /     =LED=       /
        // ------------------
        // |                |
        // |________________|
        var deltaPitch = dataJson.pitch;
        var deltaYaw = 0;
        if (refYaw < 0){
          if (dataJson.yaw < 0){
            deltaYaw = refYaw - dataJson.yaw;
          }else{
            deltaYaw = (3.13 - Math.abs(refYaw)) + (3.13 - dataJson.yaw);
          }
        }else{
          if (dataJson.yaw < 0){
            deltaYaw = -(3.13 - refYaw) - (3.13 - Math.abs(dataJson.yaw));
          }else{
            deltaYaw = refYaw - dataJson.yaw;
          }
        }
        if (deltaPitch && (deltaPitch < -0.3 || deltaPitch > 0.3) 
          && deltaYaw && (deltaYaw > -0.3 && deltaYaw < 0.3)){
          //up or down
          if (deltaPitch < 0){
            if (lastMove != 'down'){
              //console.log('down');
              ev3SendMessage('myo', 'down');
            }
            lastMove = 'down';
          }else{
            if (lastMove != 'up'){
              //console.log('up');
              ev3SendMessage('myo', 'up');
            }
            lastMove = 'up';
          }

          /*var dataTmp = Math.min(Math.abs(dataJson.pitch), 1.5);
          var percent = dataJson.pitch / 1.5;
          if (dataJson.pitch < 0){
            speed = percent * -20;
          }else{
            speed = percent * 20;
          }*/
        }else if (deltaPitch && (deltaPitch > -0.3 && deltaPitch < 0.3) 
          && deltaYaw && (deltaYaw < -0.3 || deltaYaw > 0.3)){

          // left or right
          if (deltaYaw > 0){
            if (lastMove != 'left'){              
              //console.log('left');
              ev3SendMessage('myo', 'left'); 
            }
            lastMove = 'left';
          }else{
            if (lastMove != 'right'){
              //console.log('right');
              ev3SendMessage('myo', 'right'); 
            }
            lastMove = 'right';
          }
          
        }else{
          if (lastMove != 'stop'){
            //console.log('stop');
            ev3SendMessage('myo', 'stop'); 
          }
          lastMove = 'stop';
          //speed = 0;
        }
        if (start){
          ev3SendMessage('myospeed', Math.floor(speed), true);
        }

        //ev3SendMessage('myo','stop');
      }
      //console.log(dataJson);
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
wss.on('connection', function(ws) {
    ws.on('message', function(message) {
      console.log('WS->received: %s', message);
      try{
        var dataJson = JSON.parse(message);
        if (dataJson.type && dataJson.type === 'myo'){
          ev3SendMessage('myo',dataJson.action);
        }
      }catch(e){   
        console.log(e);     
        wss.broadcast(message);
      }
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
              ev3SendMessage('myo','stop');
            
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


function ev3SendMessage(type,message, number){
  if (btSerial.isOpen()){
    console.log('BLE-> Try to write : '+type+' | with message : '+message+" | : "+hexUtils.toEV3(type,message, number));
    var buffer = new Buffer(hexUtils.toEV3(type, message, number), 'hex');
    btSerial.write(buffer, function(err, bytesWritten) {
      if (err) console.log(err);
      else console.log('BLE->datas write');
    });

  }else{
    console.log('BLE->Cannot send message because blueTooth is off');
  }
}
