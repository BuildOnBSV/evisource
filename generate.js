/*
    Example usage of rabin.js
*/
const { generatePrivKey,
    privKeyToPubKey,
    sign,
    verify } = require("./rabin.js");
const crypto = require('crypto');
const bsv = require('bsv')

let key = generatePrivKey();
console.log("key p: " + key.p);
console.log("key q: " + key.q);
// key.p = BigInt("6403482747795314265719693439597998027213992591885273721476917773455835895346691865425549613080303315669957523541096475089494529031088565845922943362139")
// key.q = BigInt("2414155685791822016873248605951668479729180822205023178538444495469460885141028889394095699670547196324300760864739934710246243622388278731155583308483")
let nRabin = privKeyToPubKey(key.p, key.q);
console.log("pubKey: " + nRabin);

let dataHex = Buffer.from("msg").toString('hex');
// console.log("dataHex = " + dataHex);

let signatureResult = sign(dataHex, key.p, key.q, nRabin);
// console.log("Signature = " + signatureResult.signature);
// console.log("Padding Bytes = " + signatureResult.paddingByteCount);

let result = verify(dataHex, signatureResult.paddingByteCount, signatureResult.signature, nRabin);
console.log("Signature Verified = " + result);
