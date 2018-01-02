'use strict'

/* global wx */
var socketOpen = false
var socket=null
function sendSocketMessage (msg) {
  //发送数据
  var byte= new egret.ByteArray(msg);
  byte.position = 0;
  socket.writeBytes(byte, 0, byte.bytesAvailable);
}

function WebSocket (url, protocols) {
  socket = new egret.WebSocket();
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
  //设置数据格式为二进制，默认为字符串
  socket.type = egret.WebSocket.TYPE_BINARY;
  //添加收到数据侦听，收到数据会调用此方法
  socket.addEventListener(egret.ProgressEvent.SOCKET_DATA, function (event) {
    //创建 ByteArray 对象
    var byte = new egret.ByteArray();
    //读取数据
    socket.readBytes(byte);
    event.data=byte.rawBuffer
    ws.onmessage && ws.onmessage.apply(ws, arguments)
  }, this);
  //添加链接打开侦听，连接成功会调用此方法
  socket.addEventListener(egret.Event.CONNECT, function (res) {
    ws.readyState = ws.OPEN
    socketOpen = true
    ws.onopen && ws.onopen.apply(ws, arguments)
  }, this);
  //添加链接关闭侦听，手动关闭或者服务器关闭连接会调用此方法
  socket.addEventListener(egret.Event.CLOSE, function () {
    ws.onclose && ws.onclose.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  }, this);
  //添加异常侦听，出现异常会调用此方法
  socket.addEventListener(egret.IOErrorEvent.IO_ERROR, function () {
    ws.onerror && ws.onerror.apply(ws, arguments)
    ws.readyState = ws.CLOSED
    socketOpen = false
  }, this);
  //连接服务器
  socket.connectByUrl(url);
  return ws
}

var websocket = require('websocket-stream')
var urlModule = require('url')

function buildUrl (opts, client) {
  var protocol = opts.protocol === 'egrets' ? 'wss' : 'ws'
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
