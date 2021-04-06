# Evisource
Evisource is a protocol to facilitate external API result attestations which can be used in Scrypt contracts. 

## Why does it matter?
Evisource is effectively a protocol specifying how individuals and businesses can sell Rabin signatures to each other. This means that you can incorporate off chain data into smart contracts, such as a Docusign signature or the price of a commodity.

## What is it, specifically?
Evisource is a protocol to provide external API result attestations to be used in Scrypt contracts. In the reference example, Evisource will attest to the truthfulness of a message by signing the message with one Rabin public key if the api query conditionals are found to be true, while the system will sign the message with another Rabin public key is used if the conditions are found to be be false. 

We also have added some scrypt contracts showing how you can utilize these signatures:
 - [https://github.com/BuildOnBSV/evisource/blob/master/rabin_msg.scrypt](https://github.com/BuildOnBSV/evisource/blob/master/rabin_msg.scrypt)
 - [https://github.com/BuildOnBSV/evisource/blob/master/multi_rabin_msg.scrypt](https://github.com/BuildOnBSV/evisource/blob/master/multi_rabin_msg.scrypt)

This allows people to any require any number of specific businesses and individuals to attest to any given number of facts, in order to unlock funds.

For example, one contract could require multiple data points to be true (logistic company A shows received while retail company B shows sent) or one contract could require multiple attestations for the same data set from different signature providers: (e.g. one from WhatsOnChain, one from Twetch)

## How to use it
1. Contact your attester to determine their Rabin public key set. They will have one Rabin public key to use if your question resolves to true, and another to use if your question resolves to false.
2. Specify what api endpoint you would like the attester to attest to via API or their user interface. 
3. Utilize their message and Rabin public key set in your Scrypt contract, such as the one shown here: https://github.com/BuildOnBSV/evisource/blob/master/rabin_msg.scrypt
4. The attester will provide signatures and public keys in accordance with their independent findings. It may be harder to influence multiple attesters, so requiring signatures from separate entities could produce a more secure result.    	

>We would advise you to choose your attesters wisely, as downtime on their behalf could result in an inability to claim a valid signature, and therefore funds. We also recommend that you build in a failsafe for occasional downtime. For example, you could require 2 of 3 attester signatures rather than 2 out of a possible total of 2.

## Become an attester
You can earn BSV by providing an endpoint which provides the inputs and outputs shown here: https://github.com/BuildOnBSV/evisource/blob/master/index.js. Make sure to publicly acknowledge your True and False Rabin public key set, as well as your profit address and minimum acceptable fee. While we don't charge a fee to attesters, we recommend they charge at least 560 satoshis for their services.

## About Evisource, the entity
We intend to support any reasonable signature schema requested by third party developers! Please let us know if we can provide signatures using a different encryption algorithm, or a different signature schema.

Additionally, we are interested in allowing people to display different means of qualifying their signatory service, such as Boost or 21e8, attestation success rate, or staking funds. If you would like to us to list your endpoint as a compatible attester, please send us a link here: buildonbsv@gmail.com

## API specification

	type: always "apiEval" at this point;
	apiURL: the url which is to be assessed;
	apiPosition: the path of the API object to the desired data point
	timeMin: unix timestamp for starting point of endpoint assessment; 
	timeMax: unix timestamp for ending point of endpoint assessment;
	evalMin: if a range of values is acceptable, provide a minimum value;
	evalMax: if a range of values is acceptable, provide a maximum value;
	evalEqual: if a range of values is unacceptable, provide the acceptable value;
	

Each transaction must send 600 BSV satoshis to 1CLC7REjofmoyUFTbVYbLBXD3rcfqWi6d6.
``` 
OP_RETURN OP_FALSE evisource contract {type:"apiEval",apiURL:"https://api.coinpaprika.com/v1/tickers/bsv-bitcoin-sv?quotes=USD",apiPosition:"quotes.USD.price",timeMin:"1617659058000",timeMax:"1717659058000",evalMin:"200",evalMax:"300",evalEqual:""} akondelin@moneybutton.com 1614547712390
```
```
fetch("https://api.evisource.com/verify", {
	crossDomain: true,
	method: "post",
	headers: { 'Content-type': 'application/json; charset=utf-8' },
	body: JSON.stringify({txid:txid})
})
.then(res => res.json())
.then((responseData) => {
	console.log(responseData)
}
```
