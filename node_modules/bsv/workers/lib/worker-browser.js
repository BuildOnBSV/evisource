/* global importScripts,YoursBitcoin,postMessage */
/**
 * Worker
 * ======
 *
 * This class is for running CPU-heavy, blocking operations. It either runs in
 * a separate process (in node), or in a web worker thread (in a browser). It
 * receives messages from outside, performs the computation, and then sends
 * back the result. You probably don't want to use this file directly, but
 * rather Work, which will automatically spawn workers if necessary and send
 * commands to them. Note that the source code for worker-node and
 * worker-browser are almost equivalent, except for code that manages the
 * differences at the bottom. This is done deliberately, so that the browser
 * version can be minimized properly.
 */
'use strict'

// The Yours Bitcoin "classes" that the worker can access. Objects sent from the
// main process/thread must be one of these types. They are defined below in a
// different way for node and the browser.
let classes

// The function to send data back to the main process/thread. This is different
// for node and browsers and thus is defined below.
let send

// len is the length of the data being sent to the worker - which may come in
// pieces. bw is a BufferWriter used to assemble the pieces, if necessary.
let len
let bw

/**
 * The generic "receive data" method that works both in node and the browser.
 * It reconstitutes the data into an object of class classname, and then runs
 * the method methodname on it with arguments args.
 */
function receive (buf) {
  // console.error('testing console.error') // Inside the node worker, please
  // use console.error to print data to the terminal for debugging purposes.

  let WorkersCmd = classes['WorkersCmd']
  let WorkersResult = classes['WorkersResult']
  let Bw = classes['Bw']
  let remainderbuf

  // buffers sent to us are prefixed with the length. If the buffer has been
  // broken up into pieces, we need to assemble them.
  if (!bw) {
    if (buf.length < 4) {
      // TODO: Don't have this. Instead of using a length prefix on the data,
      // we should use the "expect" and "genFromBuffers" feature of Struct.
      // There is an edge case waiting to happen here where the data is
      // serialized oddly and you end up with a remainderbuf of less than 4
      // bytes.
      let workersResult = new WorkersResult().fromError(new Error('buf must be prefixed with length'))
      let resBuf = workersResult.toFastBuffer()
      let resLenBuf = Buffer.alloc(4)
      resLenBuf.writeUInt32BE(resBuf.length, 0)
      send(Buffer.concat([resLenBuf, resBuf]))
      return
    }
    len = buf.readUInt32BE(0)
    if (len > 1e7) {
      console.error('Warning: excessively large buffer size of', len)
    }
    if (len > buf.length - 4) {
      bw = new Bw()
      bw.write(buf.slice(4))
      // need to wait for the rest of the message
      return
    } else if (len < buf.length - 4) {
      // sent more than one message
      remainderbuf = buf.slice(len + 4)
      buf = buf.slice(0, len + 4)
    }

    // else, the entire buf was sent in one message, can continue
    buf = buf.slice(4)
  } else {
    // getting a new piece of the message
    let bwLen = bw.getLength()
    if (len - bwLen < buf.length) {
      remainderbuf = buf.slice(len - bwLen)
      bw.write(buf.slice(0, len - bwLen))
    } else if (len === bwLen + buf.length) {
      bw.write(buf)
    } else {
      bw.write(buf)
      // need to wait for more data
      return
    }
    // got all data!
    buf = bw.toBuffer()
    bw = undefined
    len = undefined
  }

  let obj, result, id
  try {
    let workersCmd = new WorkersCmd().fromFastBuffer(buf, classes)
    id = workersCmd.id
    if (workersCmd.isobj) {
      obj = new classes[workersCmd.classname]().fromFastBuffer(workersCmd.objbuf)
    } else {
      obj = classes[workersCmd.classname]
    }
    result = obj[workersCmd.methodname].apply(obj, workersCmd.args)
  } catch (error) {
    if (!id) {
      id = 0 // must be uint
    }
    let workersResult = new WorkersResult().fromError(error, id)
    let resBuf = workersResult.toFastBuffer()
    let resLenBuf = Buffer.alloc(4)
    resLenBuf.writeUInt32BE(resBuf.length, 0)
    send(Buffer.concat([resLenBuf, resBuf]))
    return
  }
  let workersResult = new WorkersResult().fromResult(result, id)
  let resBuf = workersResult.toFastBuffer()
  let resLenBuf = Buffer.alloc(4)
  resLenBuf.writeUInt32BE(resBuf.length, 0)
  send(Buffer.concat([resLenBuf, resBuf]))

  if (remainderbuf) {
    receive(remainderbuf)
  }
}

importScripts(process.env.YOURS_BITCOIN_JS_BASE_URL + process.env.YOURS_BITCOIN_JS_POLYFILL_FILE)

// Load the main Yours Bitcoin library so we have access to classes like Msg; it
// is assumed the full library is available. It is usually called
// yours-bitcoin.js. It sets a global object called YoursBitcoin.
importScripts(process.env.YOURS_BITCOIN_JS_BASE_URL + process.env.YOURS_BITCOIN_JS_BUNDLE_FILE)
classes = YoursBitcoin
// Web workers use the global functions onmessage to receive, and postMessage
// to send.
onmessage = function (event) { // eslint-disable-line
  let buf = new YoursBitcoin.deps.Buffer(event.data)
  return receive(buf)
}
send = postMessage
