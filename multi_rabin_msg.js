/**
 * Testnet deployment for Multi rabin message contract in JavaScript
 **/
 const {
    bsv,
    buildContractClass,
    getPreimage,
    Ripemd160,
    toHex,
    Bytes,
    SigHashPreimage,
  } = require('scryptlib');
  
  const {
    loadDesc,
    loadCompiled,
    createLockingTx,
    sendTx,
    showError,
  } = require('../helper');
  
  
  const { sign } = require('rabinsig');
  
  const { privateKey } = require('../privateKey');
  
  (async () => {
  
    // scenario 1: signed by nRabin, paid to Alice
    // scenario 2: signed by nRabin1, paid to Bob
  
    const scenario = 2;
  
    let alice = 'mzUBoVQNvL7tAMuaaWuibiespzHYo9wB1a'
    let bob = 'mmcHSkRbeS4msZYt5nFp8Qhpv6zy8Z1iFK'
  
    let publicKeyHashA = bsv.Address(alice).toBuffer().slice(1)
    let publicKeyHashB = bsv.Address(bob).toBuffer().slice(1)
  
    const fee = 1500;
    const amount = 10000;
    const inputIndex = 0;
    const msg = "hello"
  
    //make signatures
    const msgBytes = new Bytes(hexEncode(msg))
  
    let p = BigInt('2365747152439569398345520895971338649880685824297802728151251803530288418524313803621635909985023445738604709826346072264938765077998632938518660973163')
    let q = BigInt('650047001204168007801848889418948532353073326909497585177081016045346562912146630794965372241635285465610094863279373295872825824127728241709483771067')
    let nRabin = BigInt('1537846842050641804202364019037104429152425773624600791021495114618765816343280467700278961438271658935841255731884366643351468538609024808471696608597670947131465015210105030969081000628075789609543195650009639032071679085534149723982492754959492831539195458222991644376763563380397344273965322874921')
  
    let p1 = BigInt('2247426751053513197944194704729868264093920629226633080142297352312599939583182463310952265684153502955469327544251659458578948144754177545750714914239')
    let q1 = BigInt('4944188769052374030034495165721994000417177496045486944079911450683191866777049527143111086759593959584714362302857778087512951049707035703050248882519')
    let nRabin1 = BigInt('11111702101826645667428965937934844534204520328077887923091257646443773788770509679175883459277811739538210751740375132778480362996243086170383378399097190090268474201550523083021107254428368314389349635297647210298691541242855567188210759297771397323970165447853117583810857142483451496402856671288041')

    let p2 = BigInt('1175934242136841073505171272765382170166309651749841731957794975907722314052517046403420073260583513313369938537908716945040505186294631274904085332447')
    let q2 = BigInt('864263819938769502095716985744058407925849803138467461501211037425523974555204951508210982076957942101837830039535492731885530843177642639042462705387')
    let nRabin2 = BigInt('1016317420105988189771745631967457060551013735372903890383569596533367069508933191608573558145475812628798681735918254898405586699223991227205026509562468777779506200597141539569142234785662935657036300600175587183029299393192522624594674155258677212790683954325060945055897831164125789787404912791989')

    let p3 = BigInt('1282153502159247139225477627421492652834307084467792489567208765614581842922659078443067884063013445866735599718152949249696385726170077531720316923211')
    let q3 = BigInt('517102249498651829494711978002105350794623276024631143572926371296295837042699748818602176678626318640661848717090938627536063375107387040209927449739')
    let nRabin3 = BigInt('663004460169121241385071329632167790161581695254054697816246022901998061793572773032053380850597011376228529769269326341149555275224108790941156831027222983162028524832295175255584884316058110895878625039173708077411435412897876020051278975155997977421031606316246355465581407376486594542528324991929')
    
    let result;
    let result1;
    switch (scenario) {
      case 1:
        result = sign(hexEncode(msg), p, q, nRabin);
        result1 = sign(hexEncode(msg), p1, q1, nRabin1);
        break;
      case 2:
        result = sign(hexEncode(msg), p2, q2, nRabin2);
        result1 = sign(hexEncode(msg), p3, q3, nRabin3);
        break;
    }
  
    let paddingBytes = '';
    for (let i = 0; i < result.paddingByteCount; i++) {
      paddingBytes += '00';
    }

    let paddingBytes1 = '';
    for (let i = 0; i < result1.paddingByteCount; i++) {
      paddingBytes1 += '00';
    }
  
    function hexEncode(str) {
      var result = '';
      for (var i = 0; i < str.length; i++) {
        result += str.charCodeAt(i).toString(16);
      }
      return result;
    }
  
    try {
  
  
      // initialize contract
      const Multi_rabin_msg = buildContractClass(loadCompiled('multi_rabin_msg_desc.json'));
      const multi_rabin_msg = new Multi_rabin_msg(new Ripemd160(toHex(publicKeyHashA)), new Ripemd160(toHex(publicKeyHashB)), fee, nRabin, nRabin1, nRabin2, nRabin3, msgBytes);
  
      // deploy contract on testnet
      const lockingTx = await createLockingTx(privateKey.toAddress(), amount, fee);
      lockingTx.outputs[0].setScript(multi_rabin_msg.lockingScript);
      lockingTx.sign(privateKey);
  
      let lockingTxid = await sendTx(lockingTx);
      console.log('funding txid:      ', lockingTxid);
  
      // call contract method on testnet
      let prevLockingScript = multi_rabin_msg.lockingScript.toASM();
  
      let unlockingTx, unlockingScript;
  
      unlockingTx = new bsv.Transaction();
  
      unlockingTx.addInput(
        new bsv.Transaction.Input({
          prevTxId: lockingTxid,
          outputIndex: inputIndex,
          script: new bsv.Script(), // placeholder
        }),
        multi_rabin_msg.lockingScript,
        amount
      );
  
      switch (scenario) {
        case 1:
          unlockingTx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(bsv.Address(alice)),
            satoshis: amount - fee,
          }))
  
          unlockingTx.fee(fee)
  
          break;
        case 2:
          unlockingTx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(bsv.Address(bob)),
            satoshis: amount - fee,
          }))
  
          unlockingTx.fee(fee)
  
          break;
      }
  
      const preimage = getPreimage(
        unlockingTx,
        prevLockingScript,
        amount
      );
  
      switch (scenario) {
        case 1:
  
          unlockingScript = multi_rabin_msg.unlock(
            new SigHashPreimage(toHex(preimage)),
            nRabin,
            result.signature,
            new Bytes(paddingBytes),
            nRabin1,
            result1.signature,
            new Bytes(paddingBytes1)
          )
            .toScript();
  
          break;
        case 2:
  
          unlockingScript = multi_rabin_msg.unlock(
            new SigHashPreimage(toHex(preimage)),
            nRabin2,
            result.signature,
            new Bytes(paddingBytes),
            nRabin3,
            result1.signature,
            new Bytes(paddingBytes1)
          )
            .toScript();
  
          break;
      }
  
      unlockingTx.inputs[0].setScript(unlockingScript);
  
      const unlockingTxid = await sendTx(unlockingTx);
      console.log('unlocking txid:   ', unlockingTxid);
  
      console.log('Succeeded on testnet');
    } catch (error) {
      console.log('Failed on testnet');
      showError(error);
    }
  })();
  