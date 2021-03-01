const fetch = require('node-fetch')
const bsv = require('bsv')

const address = '1CLC7REjofmoyUFTbVYbLBXD3rcfqWi6d6'
const fee = 600
const privKeyA = '5JBuHKiGZYwpJ3bK1GwRrVqYpq8ZATdrL2aWfAjzYdAc6sKKgZ9'
const privKeyB = '5KFG3vNE9jkruK6gHkz426wGRFr4ocytUuePLmLAntGL1gp9Jq3'
const txid = '317cd13b8410c94f9014aebb7e82311b2213e72a20beb331797ef49024613e51'


async function getOpReturn(txid) {
    var parts = []
    var paid = false
    let response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/hash/${txid}`);
    let data = await response.json();
    var vout = data.vout
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

async function getAPI(apiURL, apiPosition) {
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


(async function handler() {
    var input = await getOpReturn(txid)

    var parts = ['evisource', 'contract', '{}', 'akondelin@moneybutton.com', 1614547712390]

    var what = {
        apiURL: 'https://api.coinpaprika.com/v1/tickers/bsv-bitcoin-sv?quotes=USD',
        apiPosition: 'quotes.USD.price',
        evalEqual: 0,
        evalMin: 170,
        evalMax: 200,
        timeMin: 1614547712390,
        timeMax: 1614548712390
    }

    var type = parts[1]
    // var what = parts[1]
    var who = parts[3]
    var when = parts[4]

    console.log(input)

    var output = await getAPI(what.apiURL, what.apiPosition)
    console.log(output)

})()