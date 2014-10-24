var hexUtils = require('./hexUtils'),
 btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort(),
 express = require('express'),
 http = require('http'),
 qs = require('qs');

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
  lastMove = 'stop',
  stateSequence = -1, // Etat dans la séquence
  start = false, // True si le myo contrôle l'EV3
  debug = true, 
  withBlueTooth = true;

var WAVE_OUT = 1,
  WAVE_IN = 2,
  SPREAD = 3,
  OTHER = 4,
  DELAY_SEQUENCE = 2000;

///////////////////////////////////
///////////////////////////////////
// Server part
///////////////////////////////////
///////////////////////////////////

var app = express()
  //.use(express.logger('dev'))
  .use(express.static('public'))
  .use(function(req, res){
    // Pour chaque trame, on a un json de l'état du myo
    if (req.query.json){      
      var dataJson = JSON.parse(req.query.json);

      // S'il y a une gesture de faite et qui n'est pas la dernière
      if(dataJson.pose != 'rest' && dataJson.pose != lastGesture){
        var currentTime = new Date().getTime();
        // On vérifie qu'on essaye pas de déclancher une séquence (WaveOut->WaveIn->FingerSpread)
        // Si on dépasse le délais alors on remet les compteurs à zéro
        if (timeStart != -1 && currentTime - timeStart > DELAY_SEQUENCE){
            timeStart =-1;
            stateSequence = OTHER;
        }
        // On stocke la dernière gesture
        lastGesture = dataJson.pose;

        if (debug){          
          console.log(dataJson);
        }

        // Si le Mindstorm est sous le contrôle du myo
        if (start){
          // Si on sère le point alors on tire un élastique
          if (dataJson.pose === 'fist'){
            if (debug) {
              console.log('Fire !');
            }
            ev3SendMessage('myo','fire');
            // Juste après, on pense à arrêter le myo pour la stabilité
            setTimeout(function() {
              lastGesture = null;
              ev3SendMessage('myo','stop');
            }, 500);
          }else if (dataJson.pose === 'unknown'){
            if (debug) {
              console.log('quit');
            }
            ev3SendMessage('myo','quit');
          }
        }

        // Dans tous les cas, on regarde si on veut faire une séquence (WaveOut->WaveIn->FingerSpread)
        if (dataJson.pose === 'waveOut'){
          // On vérifie si on démare la session
          if (timeStart === -1){
            timeStart = currentTime;
            stateSequence = WAVE_OUT;
          }
          //ev3SendMessage('myo','left');
        }else if (dataJson.pose === 'waveIn'){
          // On vérifie que l'état précédent est bien waveOut
          if (timeStart != -1 
            && (stateSequence === WAVE_OUT  || stateSequence === WAVE_IN) 
            && currentTime - timeStart < DELAY_SEQUENCE){
            stateSequence = WAVE_IN;
          }
          //ev3SendMessage('myo','right');
        }else if (dataJson.pose === 'fingersSpread'){
          // On vérifie que l'état précédent est bien waveIn
          if (timeStart != -1 
            && stateSequence === WAVE_IN
            && currentTime - timeStart < DELAY_SEQUENCE){              
            // On inverse l'état, on prend le contrôle ou pas du myo
            start = !start;
            console.log('Sequence play : '+start);
            if (!start){
              ev3SendMessage('myo','quit');
            }else{
              ev3SendMessage('myo','start');
              // On initialise la position du bras !  très important pour le reste du contrôle
              refYaw = dataJson.yaw;
            }
          }
          //ev3SendMessage('myo','stop');
        }else{
          // Si on est sur un autre geste alors, on annule la séquence
          if (timeStart != -1 
            && currentTime - timeStart < DELAY_SEQUENCE){
            timeStart = -1;
            stateSequence = OTHER;
          }
        }

        //ev3SendMessage('myo',dataJson.pose);
      }else if(start && dataJson.pose === 'rest'){
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
        // On calcule le delta autour de z en tenant comptes du point de référence.
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

        // Le pitch se penche en avant ou en arrière et le yaw est stable => on avance ou recule
        if (deltaPitch && (deltaPitch < -0.3 || deltaPitch > 0.3) 
          && deltaYaw && (deltaYaw > -0.3 && deltaYaw < 0.3)){
          //up or down
          if (deltaPitch < 0){
            if (lastMove != 'down'){
              if (debug){
                console.log('down');
              }
              ev3SendMessage('myo', 'down');
            }
            lastMove = 'down';
          }else{
            if (lastMove != 'up'){
              if (debug){
                console.log('up');
              }
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
          // Le pitch est horizontal et le yaw va vers la droite ou gauche => on tourne à droite ou a gauche
        }else if (deltaPitch && (deltaPitch > -0.3 && deltaPitch < 0.3) 
          && deltaYaw && (deltaYaw < -0.3 || deltaYaw > 0.3)){

          // left or right
          if (deltaYaw > 0){
            if (lastMove != 'left'){              
              if (debug){
                console.log('left');
              }
              ev3SendMessage('myo', 'left'); 
            }
            lastMove = 'left';
          }else{
            if (lastMove != 'right'){
              if (debug){
                console.log('right');
              }
              ev3SendMessage('myo', 'right'); 
            }
            lastMove = 'right';
          }
          
        }else{
          // Tout est stable => on s'arrête
          if (lastMove != 'stop'){
            if (debug){
              console.log('stop');
            }
            ev3SendMessage('myo', 'stop'); 
          }
          lastMove = 'stop';
        }
      }
    }
    res.end('hello world\n'+req.query.test);
  });

http.createServer(app).listen(8090);
console.log('-------------------------------');
console.log('Start Http server on port : '+8090);


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
if (withBlueTooth){
  btSerial.inquire();
}


function ev3SendMessage(type,message, number){
  if (btSerial.isOpen()){
    if (debug){
      console.log('BLE-> Try to write : '+type+' | with message : '+message+" | : "+hexUtils.toEV3(type,message, number));
    }
    var buffer = new Buffer(hexUtils.toEV3(type, message, number), 'hex');
    btSerial.write(buffer, function(err, bytesWritten) {
      if (err) console.log(err);
      else console.log('BLE->datas write');
    });

  }else{
    console.log('BLE->Cannot send message because blueTooth is off');
  }
}
