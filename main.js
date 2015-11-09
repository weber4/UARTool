var input_output;
var self;

// utility. extract to another file.
var ab2str=function(buf) {
  var bufView=new Uint8Array(buf);
  var unis=[];
  for (var i=0; i<bufView.length; i++) {
    unis.push(bufView[i]);
  }
  return String.fromCharCode.apply(null, unis);
};

var str2ab = function(str) {
  //console.log("str2ab length=" + str.length);
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0; i<str.length; i++) {
    bufView[i] = str.charCodeAt(i);
    console.log(str,i,bufView[i]);
  }
  return buf;
}

var Crosh = function(argv) {
  this.argv_ = argv;
  this.io = null;
  this.keyboard_ = null;
  this.pid_ = -1;
  this.connectionId = -1;
  this.portInfo_ = null;
  this.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this, true /* fromKeyboard */);
    this.io.sendString = this.sendString_.bind(this, false /* fromKeyboard */);
    this.io.println("\033[0;1;33mWelcome to UARTool! \033[m");
    input_output = this.io;
    self = this;
    chrome.serial.getDevices(function(ports) {
      var eligiblePorts = ports;

      if (eligiblePorts.length > 0) {
        eligiblePorts.forEach(function(portNames) {
          var portPicker = document.querySelector('#port-picker');
          var portName = portNames.path;
          portPicker.innerHTML = portPicker.innerHTML + '<option value="' +
                                 portName +'">' + portName + '</option>';
        });
      }
    });

    var BITRATE_KEY = 'bit_rate';
    chrome.storage.local.get(BITRATE_KEY, function(result) {
      if (result.bit_rate !== undefined) {
        document.querySelector('#bitrate-picker').value = result[BITRATE_KEY];
      } else {
        document.querySelector('#bitrate-picker').value = "115200";
      }
    });

    var PORT_KEY = 'port';
    chrome.storage.local.get(PORT_KEY, function(result) {
      //console.log(result);
      document.querySelector('#port-picker').value = result[PORT_KEY];
    });

  };
  this.sendString_ = function(fromKeyboard, string) {
    //console.log('ch=' + string + " ascii=" + string.charCodeAt(0));
    chrome.serial.send(self.connectionId, str2ab(string), function () { });
  };
  this.exit = function(code) {
  };
};

function UARTListener(info) {
  if (info && info.data) {
    input_output.print(ab2str(info.data));
  }
}

window.onload = function() {
  //console.log("window.onload !")
  hterm.defaultStorage = new lib.Storage.Chrome(chrome.storage.sync);
  var t = new hterm.Terminal("opt_profileName");
  t.decorate(document.querySelector('#terminal'));

  t.onTerminalReady = function() {
    //console.log("onTerminalReady")
    t.runCommandClass(Crosh, document.location.hash.substr(1));
    return true;
  
  };

  document.getElementById("connect").addEventListener('click', function(e) {
    // If |input_output| is null, it means hterm is not ready yet.
    if (document.getElementById("connect").innerHTML == "Connect") {

      if (!input_output)
        return;
      var elem = document.querySelector('#port-picker');
      var port = elem.value;
      var bitelem = document.querySelector('#bitrate-picker');
      var bitrate = Number(bitelem.options[bitelem.selectedIndex].value);

      var BITRATE_KEY = 'bit_rate';
      var obj = {};
      obj[BITRATE_KEY] = bitelem.value;
      chrome.storage.local.set(obj);
      
      var PORT_KEY = 'port';
      var obj = {};
      obj[PORT_KEY] = elem.value;
      chrome.storage.local.set(obj);

      chrome.serial.connect(port, {'bitrate': bitrate}, function(openInfo) {
        input_output.println('\033[0;1;33mConnected to ' + port + "\033[0m");
        self.connectionId = openInfo.connectionId;
        AddConnectedSerialId(openInfo.connectionId);
        document.getElementById("main").style.opacity = 1;
        //document.getElementById("main").style.focus();
        chrome.serial.onReceive.addListener( UARTListener );
      });
      document.getElementById("connect").innerHTML = "Disconnect";
      document.getElementById("connect").classList.add("btn-danger");
      document.getElementById("connect").classList.remove("btn-primary");

    }
    else {
      chrome.serial.disconnect(self.connectionId, function () { });
      document.getElementById("connect").innerHTML = "Connect";
      document.getElementById("connect").classList.add("btn-primary");
      document.getElementById("connect").classList.remove("btn-danger");

      input_output.println('\033[0;1;33mDisconnected from ' + document.getElementById('port-picker').value + "\033[0m");
      chrome.serial.onReceive.removeListener( UARTListener );
    }
  });
  
  document.getElementById("AddButton").addEventListener('click', function(e) { 
    document.getElementById("myModalLabel").innerHTML = "New Button";
    document.getElementById("NewButtonName").value = "";
    document.getElementById("NewButtonCommands").value = "";

  });
  
  document.getElementById("NewButtonSave").addEventListener('click', function(e) { 
    if (document.getElementById("myModalLabel").innerHTML == "New Button")
    {
      ExtensionData.buttons.push(
        {name: document.getElementById("NewButtonName").value, command: document.getElementById("NewButtonCommands").value}
      );
      i = ExtensionData.buttons.length - 1;
      AddButton(i,document.getElementById("NewButtonName").value,document.getElementById("NewButtonCommands").value);
    }
    if (document.getElementById("myModalLabel").innerHTML == "Edit Button")
    {
      i = document.getElementById("EditId").value;
      ExtensionData.buttons[i].name = document.getElementById("NewButtonName").value;
      ExtensionData.buttons[i].command = document.getElementById("NewButtonCommands").value;
      document.getElementById("button" + i).innerHTML = ExtensionData.buttons[i].name;
      
    }
    DB_save();
  });

  setTimeout(function() { 
    document.getElementById("connect").click(); }, 500)
  
  //console.log(document.getElementById("connect"));
};

var ExtensionDataName = "myfirstextensiondata";
var ExtensionData = {
  dataVersion: 3, //if you want to set a new default data, you must update "dataVersion".
  buttons: []
};

function DB_setValue(data, value, callback) {
    var obj = {};
    obj[data] = value;
    //console.log("Data Saved!");
    chrome.storage.local.set(obj, function() {
        if(callback) callback();
    });
}

function DB_load(callback) {
    chrome.storage.local.get(ExtensionDataName, function(r) {
        if (isEmpty(r[ExtensionDataName])) {
            DB_setValue(ExtensionDataName, ExtensionData, callback);
        } else if (r[ExtensionDataName].dataVersion != ExtensionData.dataVersion) {
            DB_setValue(ExtensionDataName, ExtensionData, callback);
        } else {
            ExtensionData = r[ExtensionDataName];
            callback();
        }
    });
}

function DB_save(callback) {
    DB_setValue(ExtensionDataName, ExtensionData, function() {
        if(callback) callback();
    });
}

function DB_clear(callback) {
    chrome.storage.local.remove(ExtensionDataName, function() {
        if(callback) callback();
    });
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

function AddButton(i,name,command)
{
  var button ='<div id="row'+ i +'" class="input-group" style="width: 100%;padding: 3px;">';
  button    +=' <button id="button' + i + '" style="width:134px;float:left;margin-right:7px;" href="#" class="btn btn-block btn-primary">' + name + '</button>';
  button    +=' <button id="edit' + i + '" style="margin-right:7px;background-color:#E0E0E0;" type="button" class="btn btn-default" data-toggle="modal" data-target="#AddButtonModal">';
  button    +='   <span class="glyphicon glyphicon-cog" aria-hidden="true"></span>';
  button    +=' </button>';
  button    +=' <button id="delete' + i + '" type="button" class="btn btn-default" style="background-color:#E0E0E0;">';
  button    +='   <span class="glyphicon glyphicon-trash" aria-hidden="true"></span>';
  button    +=' </button>';
  button    +='</div>';
  $("#buttons").append(button);

  // A button is clicked
  document.getElementById("button" + i).addEventListener('click', function(e) {
      chrome.serial.send(
        self.connectionId, 
        str2ab(ExtensionData.buttons[i].command.replace(/(\r\n|\n|\r)/gm,"\r")),
        function () { }
      ); 
  });

  // Edit button clicked
  document.getElementById("edit" + i).addEventListener('click', function(e) {
    document.getElementById("myModalLabel").innerHTML = "Edit Button";
    document.getElementById("NewButtonName").value = ExtensionData.buttons[i].name;
    document.getElementById("NewButtonCommands").value = ExtensionData.buttons[i].command;
    document.getElementById("EditId").value = i;
  });


  // Delete button clicked
  document.getElementById("delete" + i).addEventListener('click', function(e) {
      document.getElementById("row" + i).remove();
      ExtensionData.buttons.splice(i,1);
      DB_save();
      //console.log(ExtensionData.buttons);
  });


}

DB_load(function() {
    //Display existing buttons
    for (var i = 0; i < ExtensionData.buttons.length; i++) {
      AddButton(i,ExtensionData.buttons[i].name,ExtensionData.buttons[i].command);
    } 
});