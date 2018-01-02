'use strict'
var Event  = Laya.Event;
var Socket = Laya.Socket;
var Byte   = Laya.Byte;
/* global wx */
var socketOpen = false
var socket=null
function sendSocketMessage (msg) {
  socket.send(msg);
  socket.flush();
}

function WebSocket (url, protocols) {
  socket = new Socket();
  var ws = {
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: socketOpen ? 1 : 0,
    send: sendSocketMessage,
    close: socket.close,
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null
  }
  socket.on(Event.OPEN, this, function (res) {
    ws.readyState = ws.OPEN
    socketOpen = true
    ws.onopen && ws.onopen.apply(ws, arguments)
  });
  socket.on(Event.CLOSE, this, function () {
    ws.onclose && ws.onclose.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  });
  socket.on(Event.MESSAGE, this, function (message) {
    //console.log(Object.prototype.toString.call(message));
    var event=new Object();
    event.data=message
    ws.onmessage && ws.onmessage.call(ws, event)
  });
  socket.on(Event.ERROR, this, function () {
    ws.onerror && ws.onerror.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  });
  //连接服务器
  socket.protocols=protocols
  socket.endian=Socket.BIG_ENDIAN
  socket.connectByUrl(url);
  return ws
}

var websocket = require('websocket-stream')
var urlModule = require('url')

function buildUrl (opts, client) {
  var protocol = opts.protocol === 'layas' ? 'wss' : 'ws'
  var url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
}

function createWebSocket (client, opts) {
  var websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  var url = buildUrl(opts, client)
  return websocket(WebSocket(url, [websocketSubProtocol]))
}

function buildBuilder (client, opts) {
  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    var parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }
  return createWebSocket(client, opts)
}

module.exports = buildBuilder
