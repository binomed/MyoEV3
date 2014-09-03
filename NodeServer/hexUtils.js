
function d2h(d) {
    return d.toString(16);
}
function h2d (h) {
    return parseInt(h, 16);
}
function numToHex(number){
  var str = '',
    i = 0,
    tmp = (number).toString(16);
  if (tmp.length % 2 != 0){
    tmp = '0'+tmp;
  }
  for (; i < tmp.length; i+=1){
    if (i > 0 && i % 2 ==0){
      str += ' ';
    }
    str += tmp[i];
  }
  return str;
}

function stringToHex (tmp) {
    var str = '',
        i = 0,
        tmp_len = tmp.length,
        c;
 
    for (; i < tmp_len; i += 1) {
        c = tmp.charCodeAt(i);
        str += d2h(c) + ' ';
    }
    return str;
}
function hexToString (tmp) {
    var arr = tmp.split(' '),
        str = '',
        i = 0,
        arr_len = arr.length,
        c;
 
    for (; i < arr_len; i += 1) {
        c = String.fromCharCode( h2d( arr[i] ) );
        str += c;
    }
 
    return str;
}

function toEV3(title, message){
  var data = [];
  data.push(0); // To update after; Number of Bytes in the packet excluding the initial 2 bytes
  data.push('00'); // To update after; Number of Bytes in the packet excluding the initial 2 bytes
  data.push('01'); // Message Counter
  data.push('00'); // Message Counter
  data.push('81'); // 0x81 for command with no reply
  data.push('9E'); // x09E for WRITE MAIL BOX (communication with throught bluetooth)

  var titleArray = stringToHex(title).split(' ');
  data.push(numToHex(titleArray.length)); // Length of the mail box name including terminitation character
  for (var i = 0; i < titleArray.length - 1; i++){
    data.push(titleArray[i]); // All the char of title
  }
  data.push('00'); // \0 for the termination of title

  var messageArray = stringToHex(message).split(' ');
  var lengthArray = numToHex(messageArray.length).split(' ');
  data.push(lengthArray[0]); // Size of message
  if (lengthArray.length > 1){
    data.push(lengthArray[1]); // Size of message
  }else{
    data.push('00'); // Size of message
  }
  for (var i = 0; i < messageArray.length - 1; i++){
    data.push(messageArray[i]); // All the char of message
  }
  data.push('00'); // \0 for the termination of message

  // We update the length of message
  var lengthDataArray = numToHex(data.length-2).split(' ');
  data[0] = lengthDataArray[0];
  if (lengthDataArray.length > 1){
    data[1] = lengthDataArray[1];
  }

  return data.join('');
}


module.exports = {
  toEV3 : toEV3,
  stringToHex : stringToHex,
  hexToString : hexToString
}
