'use strict'
const serverless = require('serverless-http');
// const bodyParser = require("body-parser");
// const { v4: uuidv4 } = require('uuid'); 
const express = require('express');
const crypto = require('crypto')
const fetch = require("node-fetch");
const { privKeyToPubKey, sign, verify } = require("rabinsig");
const app = express();

const AWS = require('aws-sdk');

const rabinA = {
  p: BigInt(process.env.PINT),
  q: BigInt(process.env.QINT)
}
const rabinB = {
  p: BigInt(process.env.PINT1),
  q: BigInt(process.env.QINT1)
}

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(bodyParser.json({
//   limit: '50mb',
//   type: 'application/json'
// }));
// app.use(require('body-parser').json())


module.exports.handler = serverless(app);



app.get('/keyset', async function (req, res) {
  let nRabin = privKeyToPubKey(rabinA.p, rabinA.q);
  let nRabin1 = privKeyToPubKey(rabinB.p, rabinB.q);

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.send({
    statusCode: 200,
    body: {
      trueRabin: nRabin.toString(),
      falseRabin: nRabin1.toString()
    }
  })

})
app.get('/verify/:txid', async function (req, res) {
  let txid = req.params.txid;
  let address = process.env.ADDRESS

  const fee = 600


  async function getOpReturn(txid) {
    let parts = []
    let paid = false
    let response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`);
    let data = await response.json();
    const vout = data.vout
    for (var i = 0; i < vout.length; i++) {
      try {
        if (vout[i]['scriptPubKey']['type'] == 'nulldata') {
          parts = vout[i]['scriptPubKey']['opReturn']['parts']
        }
      } catch (err) {
        console.log(err)
      }
      try {
        if ((vout[i]['value'] * 100000000 >= fee) && (vout[i]['scriptPubKey']['addresses'][0] == address)) {
          paid = true
        }
      } catch (err) {
        console.log(err)
      }
    }
    return { parts: parts, paid: paid }
  }

  async function getAPI(what) {
    const apiURL = what.apiURL
    const apiPosition = what.apiPosition
    let response = await fetch(apiURL);
    let data = await response.json();
    let value = getNestedValue(data, apiPosition)
    return value
  }
  function getNestedValue(obj, key) {
    return key.split(".").reduce(function (result, key) {
      return result[key]
    }, obj);
  }
  function whichKey(what, output) {
    const now = Date.now()
    // ensure all fields are present
    if (!('type' in what) || !('apiURL' in what) || !('apiPosition' in what) || !('evalEqual' in what) || !('evalMin' in what) || !('evalMax' in what) || !('timeMin' in what) || !('timeMax' in what)) {
      console.log(false)
      return false;
    }
    // ensure extraneous fields are not present
    if (Object.keys(what).length > 8) {
      console.log(false)
      return false;
    }
    if (now < parseInt(what.timeMin) || now > parseInt(what.timeMax)) {
      console.log(now)
      return false;
    } else if (what.evalEqual != '') {
      if (output == what.eval) {
        return { p: rabinA.p, q: rabinA.q, status: true }
      } else {
        return { p: rabinB.p, q: rabinB.q, status: false }
      }

    } else {
      if (output > parseFloat(what.evalMin) && output < parseFloat(what.evalMax)) {
        return { p: rabinA.p, q: rabinA.q, status: true }
      } else {
        return { p: rabinB.p, q: rabinB.q, status: false }
      }
    }
  }
  var input = await getOpReturn(txid)
  var parts = input.parts

  var type = parts[1]
  var what = JSON.parse(parts[2])
  var who = parts[3]
  var when = parts[4]



  var output = await getAPI(what)
  var key = whichKey(what, output)
  if (key) {
    let nRabin = privKeyToPubKey(key.p, key.q);
    // console.log("pubKey: " + nRabin);
    console.log('msg:', JSON.stringify(what))
    let dataHex = Buffer.from(JSON.stringify(what)).toString('hex');
    let signatureResult = sign(dataHex, key.p, key.q, nRabin);
    let result = verify(dataHex, signatureResult.paddingByteCount, signatureResult.signature, nRabin);
    console.log({ verified: result })
    var data = {
      pubkey: nRabin.toString(),
      signature: signatureResult.signature.toString(),
      padding: signatureResult.paddingByteCount,
      dataHex: dataHex,
      dataUtf8: what,
      attestation: key.status

    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send({
      statusCode: 200,
      body: data
    })

  } else {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send({
      statusCode: 200,
      body: { error: 'Outside time constraints.' }
    })
  }


});

