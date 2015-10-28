chrome.app.runtime.onLaunched.addListener(function() {
  new UARToolWindow();
});

var UARToolWindow = function() {
  var connectedSerialId = 0;
  chrome.app.window.create(
    'UARTool.html',
    {
      outerBounds: {
        width: 1024,
        height: 768
      }
    },
    function(win) {
      win.contentWindow.AddConnectedSerialId = function(id) {
        connectedSerialId = id;
      };
      win.onClosed.addListener(function() {
        chrome.serial.disconnect(connectedSerialId, function () {
        });
      });
    }
  );
}
