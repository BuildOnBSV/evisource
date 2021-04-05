const fetch = require('node-fetch')
const { privKeyToPubKey, sign, verify } = require("rabinsig");


let address = '1CLC7REjofmoyUFTbVYbLBXD3rcfqWi6d6'
var event = { body: '{txid:"1ca91babd11b34b430d6704a1fe35cee682216947d9a5da818f96bc96d8dd6bc"}' }
// let txid = '1ca91babd11b34b430d6704a1fe35cee682216947d9a5da818f96bc96d8dd6bc'
var body = JSON.parse(event.body)
var txid = body.txid

const fee = 600
const rabinA = {
    p: BigInt('4972155471819184227072138670792625396161146659290530110464085777559131381591439007466499528160104432589998146429103332640188818181324684948978616845003'),
    q: BigInt('925868082702228627746683316784125419713447611934681419785848589958486698968445305955236766384101629424107255839376516942365997369636208399116514170143')
}
const rabinB = {
    p: BigInt('1013559359933644911268104455507081176040657679922408252171376367460214120009045678089821418031246163053850216476350627319835145754928152670505732105403'),
    q: BigInt('5623349601129827232829418115075641251922319860813585051552447420783288812625946236564414733689663499669087881562745880381567975642704327754952163648043')
}



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


(async function handler() {
    var ops = await getOpReturn(txid)
    var parts = ops.parts

    var type = parts[1]
    var what = JSON.parse(parts[2])
    var who = parts[3]
    var when = parts[4]


    var output = await getAPI(what)
    var key = whichKey(what, output)
    if (key) {
        let nRabin = privKeyToPubKey(key.p, key.q);
        console.log('msg:', JSON.stringify(what))
        let dataHex = Buffer.from(JSON.stringify(what)).toString('hex');
        let signatureResult = sign(dataHex, key.p, key.q, nRabin);
        let result = verify(dataHex, signatureResult.paddingByteCount, signatureResult.signature, nRabin);
        console.log({ verified: result })
        console.log({
            pubkey: nRabin.toString(),
            signature: signatureResult.signature.toString(),
            padding: signatureResult.paddingByteCount,
            dataHex: dataHex,
            dataUtf8: Buffer.from(dataHex, 'hex').toString('utf8'),
            attestation: key.status
        })

    } else {
        console.log({ error: "time out of scope." })
    }


})()
