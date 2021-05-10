'use strict'
const serverless = require('serverless-http');
// const bodyParser = require("body-parser");
const express = require('express');
const crypto = require('crypto')
const fetch = require("node-fetch");
const bsv = require("bsv")
const Message = require('bsv/message')
const Mnemonic = require('bsv/mnemonic')

const { generatePrivKeyFromSeed,
  privKeyToPubKey,
  sign,
  verify } = require("./rabin.js");
// const { v4: uuidv4 } = require('uuid'); 
const app = express();

const AWS = require('aws-sdk');


// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(bodyParser.json({
//   limit: '50mb',
//   type: 'application/json'
// }));
// app.use(require('body-parser').json())


module.exports.handler = serverless(app);



app.get('/keyset', async function (req, res) {
  var mnemonic = Mnemonic.fromString(process.env.MNEMONIC)
  var xpriv = mnemonic.toHDPrivateKey()
  var keypairs = []
  const derive = (xpriv, index) => {
    let bip44 = "m/44'/0'/0'/0";
    let next = bip44 + "/" + index
    // let next = index
    let xpriv2 = xpriv.deriveChild(next)
    let xpub2 = bsv.HDPublicKey.fromHDPrivateKey(xpriv2)
    let priv2 = xpriv2.privateKey;
    let pub2 = xpriv2.publicKey;
    let address2 = xpriv2.privateKey.toAddress();
    // console.log(address2)
    // console.log(priv2)
    return {
      id: index,
      xpriv: xpriv2.toString(),
      xpub: xpub2.toString(),
      priv: priv2.toString(),
      pub: pub2.toString(),
      address: address2.toString()
    }
  }
  var count = 0
  var n = 0
  const generate = (xpriv) => {
    console.log('generating')
    for (let i = 0; i < 2; i++) {
      count++
      let key = derive(xpriv, n)
      // console.log(`${bip44}/${i} ${key.address} '${buttonpage(key)}'`);
      keypairs.push({ "address": key.address, "public": key.pub, "private": key.priv, "index": i })
      if (count == 1) {
        try {
          var publicKey = bsv.PublicKey.fromString(key.pub)
          var privateKey = bsv.PrivateKey.fromString(key.priv)
          var address = bsv.Address.fromPublicKey(publicKey)
          var message = Date.now().toString()
          var sig = Message.sign(message, privateKey)

          var verified = Message.verify(message, address, sig)


          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          res.send({
            statusCode: 200,
            body: {
              keyInfo: {
                xpub: key.xpub.toString(),
                index: n,
                pub: key.pub.toString(),
                message: message,
                signature: sig
              },
              version: '0.1.2',
              minimumSatoshis: parseInt(process.env.FEE),
              profitAddress: process.env.ADDRESS
            }
          })
        } catch (err) {
          console.log(err)
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          res.send({
            statusCode: 500,
            body: { err: 'err' }
          })
        }
      }
    }
  }
  generate(xpriv)
})

app.get('/verify/:txid', async function (req, res) {
  let txid = req.params.txid;
  let address = process.env.ADDRESS

  const fee = parseInt(process.env.FEE)


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
  function whichKey(dataHex, output) {
    var what = JSON.parse(Buffer.from(dataHex, 'hex').toString('utf8'));
    const now = Date.now()
    const derive = (xpriv, index) => {
      let bip44 = "m/44'/0'/0'/0";
      let next = bip44 + "/" + index
      // let next = index
      let xpriv2 = xpriv.deriveChild(next)
      let xpub2 = bsv.HDPublicKey.fromHDPrivateKey(xpriv2)
      let priv2 = xpriv2.privateKey;
      let pub2 = xpriv2.publicKey;
      let address2 = xpriv2.privateKey.toAddress();
      return {
        id: index,
        xpriv: xpriv2.toString(),
        xpub: xpub2.toString(),
        priv: priv2,
        pub: pub2.toString(),
        address: address2.toString()
      }
    }
    var mnemonic = Mnemonic.fromString(process.env.MNEMONIC)
    var xpriv = mnemonic.toHDPrivateKey()
    let keyToUse = derive(xpriv, 0)

    let msgHash = crypto.createHash('sha256').update(dataHex).digest('hex')
    let msgHash1 = crypto.createHash('sha256').update(msgHash).digest('hex')

    var sig = Message.sign(msgHash, keyToUse.priv)
    var sig1 = Message.sign(msgHash1, keyToUse.priv)
    let key = generatePrivKeyFromSeed(sig);
    let key1 = generatePrivKeyFromSeed(sig1);

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
      return { trueKey: key, falseKey: key1, valid: false }

    } else if (what.evalEqual != '') {
      if (output == what.eval) {
        return { p: key.p, q: key.q, status: true, valid: true, keyToUse: keyToUse, sig: sig }
      } else {
        return { p: key1.p, q: key1.q, status: false, valid: true, keyToUse: keyToUse, sig: sig1 }
      }
    } else {
      if (output > parseFloat(what.evalMin) && output < parseFloat(what.evalMax)) {
        return { p: key.p, q: key.q, status: true, valid: true, keyToUse: keyToUse, sig: sig }
      } else if (output < parseFloat(what.evalMin) || output > parseFloat(what.evalMax)) {
        return { p: key1.p, q: key1.q, status: false, valid: true, keyToUse: keyToUse, sig: sig1 }
      } else {
        return false
      }
    }
  }
  var input = await getOpReturn(txid)
  var parts = input.parts
  var paid = input.paid

  var type = parts[1]
  var what = JSON.parse(parts[2])
  var who = parts[3]
  var when = parts[4]



  var output = await getAPI(what)
  var dataHex = Buffer.from(JSON.stringify(what)).toString('hex');
  var key = whichKey(dataHex, output)
  if (paid == true) {
    if (key.valid == true) {
      let nRabin = privKeyToPubKey(key.p, key.q);
      console.log('msg:', JSON.stringify(what))

      let signatureResult = sign(dataHex, key.p, key.q, nRabin);
      let result = verify(dataHex, signatureResult.paddingByteCount, signatureResult.signature, nRabin);
      console.log({ verified: result })
      var data = {
        rabinInfo: {
          rabinPubkey: nRabin.toString(),
          signature: signatureResult.signature.toString(),
          padding: signatureResult.paddingByteCount,
          dataHex: dataHex,
          dataUtf8: what,
          attestation: key.status
        },
        keyInfo: {
          xpub: key.keyToUse.xpub,
          index: key.keyToUse.id,
          pub: key.keyToUse.pub,
          message: dataHex,
          signature: key.sig
        }
      }

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.send({
        statusCode: 200,
        body: data
      })
    } else if (key.valid == false) {
      let nRabin = privKeyToPubKey(key.trueKey.p, key.trueKey.q);
      let nRabin1 = privKeyToPubKey(key.falseKey.p, key.falseKey.q);
      let dataHex = Buffer.from(JSON.stringify(what)).toString('hex');

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.send({
        statusCode: 200,
        body: {
          msg: 'Outside of time constraints.',
          trueRabinPubkey: nRabin.toString(),
          falseRabinPubkey: nRabin1.toString(),
          dataHex: dataHex,
          dataUtf8: what

        }
      })
    } else {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.send({
        statusCode: 200,
        body: {
          msg: 'Invalid format. Sufficient payment.'

        }
      })
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send({
      statusCode: 200,
      body: {
        msg: 'Insufficient payment',
        minimumSatoshis: parseInt(process.env.FEE),
        profitAddress: process.env.ADDRESS

      }
    })
  }


});

