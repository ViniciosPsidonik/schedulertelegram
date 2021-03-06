const { MTProto, getSRPParams } = require('./core/index');
const WebSocket = require('ws')
const axios = require('axios')
const moment = require('moment')
const prompts = require('prompts');
var express = require('express')
var app = express()

const cors = require('cors')
const bodyParser = require('body-parser')

app.use(cors({ origin: '*' }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded());

app.get('/', (req, res) => {
    res.status(200).send('Helooou')
})

const api_id = 5714815 // insert api_id here
const api_hash = 'ec420ec9398e2b0577dcfa5f47b09f5d'; // insert api_hash here

let config
let code
app.post('/config', (req, res) => {
    let params = req.body
    config = params
    amount = config.amount
    StopLoss = config.StopLoss
    StopWin = config.StopWin
    conta = config.conta
    otc = config.otc
    stopp = config.stopp
    if (config.sessionBalance)
        sessionBalance = config.sessionBalance

    res.sendStatus(200)
})

app.post('/code', (req, res) => {
    let params = req.body

    code = params.code
    res.sendStatus(200)
})

function getCode() {
    return new Promise((resolve) => {
        const aaa = setInterval(() => {
            if (code) {
                clearInterval(aaa)
                return resolve(code)
            }
        }, 500);
    })
}

async function getPassword() {
    return (await prompts({
        type: 'text',
        name: 'password',
        message: 'Enter Password:',
    })).password
}


const mtproto = new MTProto({
    api_id,
    api_hash,
});

let galeString = 'G2'
let frameString = ''
let type = '1'
let activesStringss = []
let schedules = []
let otc = false
const scheduleTrades = msg => {
    if (msg) {
        let messagesArray = msg.toString()
        if (messagesArray.toUpperCase().includes('SINAIS POR TEMPO')) {

            let direction
            let time
            let parInt

            if (msg.includes('PUT')) {
                direction = 'put'
            } else {
                direction = 'call'
            }


            for (var [key, value] of activesMapString.entries()) {
                if (messagesArray.replace('/', '').includes(key)) {
                    parInt = value
                }
            }

            let msgSpace = messagesArray.split('\n')
            for (let index1 = 0; index1 < msgSpace.length; index1++) {
                const element = msgSpace[index1].replace('\n', '').split(' ');

                // console.log(element);n

                let achou = false

                for (let index = 0; index < element.length; index++) {
                    const element1 = element[index];
                    if (achou && element1.includes(':')) {
                        time = element1.replace('h', '')
                        break
                    }
                    if (element1 == 'Sinais')
                        achou = true
                }
            }


            schedules.push({
                parInt,
                direction,
                time
            })
            console.log(schedules);
            console.log(schedules.length);
        }

        if (!ws)
            loginnnn()
    }
}

const verifyObj = (array, obj) => {
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        if (element.time && element.time == obj.time && element.active && element.active == obj.active)
            return true
    }
    return false
}
let stopp = false
function startListener() {
    console.log('[+] starting listener')
    mtproto.updates.on('updates', (update) => {
        let { updates } = update
        for (let index = 0; index < updates.length; index++) {
            const update = updates[index];
            // console.log(updates);
            if (update && update.message) {
                const message = update.message.message
                console.log(message);
                if (!stopp)
                    scheduleTrades(message)
            }
        }
    });

    // console.log(mtproto.channels);

    mtproto.updates.on('updateShortMessage', (updates) => {
        console.log(updates);
        console.log('updateShortMessage');

        if (!stopp)
            scheduleTrades(updates.message)
    });


    mtproto.updates.on('updateShortChatMessage', (updates) => {
        console.log(updates);
        console.log('updateShortChatMessage');
        if (!stopp)
            scheduleTrades(updates.message)
    });

    mtproto.updates.on('updatesTooLong', (updates) => {
        console.log(updates);
        console.log('updatesTooLong');
        if (!stopp)
            scheduleTrades(updates.message)
    });

    mtproto.updates.on('updatesCombined', (updates) => {
        console.log(updates);
        console.log('updatesCombined');
        if (!stopp)
            scheduleTrades(updates.message)
    });

    mtproto.updates.on('updateShortSentMessage', (updates) => {
        console.log(updates);
        console.log('updateShortSentMessage');
        if (!stopp)
            scheduleTrades(updates.message)
    });

}

// setInterval(() => {
//     startListener()
// }, 1500000);

const loginnnn = () => {
    ws = new WebSocket(url)
    ws.onopen = onOpen
    ws.onerror = onError
    ws.onmessage = onMessage
    axios.post('https://auth.iqoption.com/api/v2/login', {
        identifier: config.login,
        password: config.password
    }).then((response) => {
        ssid = response.data.ssid
        console.log(ssid);
        loginAsync(ssid)
    }).catch(function (err) {
        console.log(err);
        if (err)
            console.log('Erro ao se conectar... Tente novamente')
    })
}

function sendCode(phone) {
    return mtproto.call('auth.sendCode', {
        phone_number: phone,
        settings: {
            _: 'codeSettings',
        },
    });
}

app.post('/run', (req, res) => {
    console.log('aquii');

    // The user is not logged in
    console.log('[+] You must log in')
    let phone_number = '+5554996722197'
    mtproto.call('auth.sendCode', {
        phone_number: phone_number,
        settings: {
            _: 'codeSettings',
        },
    })
        .catch(error => {
            console.log(error);
            if (error.error_message.includes('_MIGRATE_')) {
                const [type, nextDcId] = error.error_message.split('_MIGRATE_');

                mtproto.setDefaultDc(+nextDcId);

                return sendCode(phone_number);
            }
        })
        .then(async result => {
            console.log('then1');
            let codeHere = await getCode()
            console.log(codeHere);
            console.log(result);
            code = undefined
            return mtproto.call('auth.signIn', {
                phone_code: codeHere,
                phone_number: phone_number,
                phone_code_hash: result.phone_code_hash,
            })
        })
        .catch(error => {
            console.log(error);
            if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
                return mtproto.call('account.getPassword').then(async result => {
                    const { srp_id, current_algo, srp_B } = result;
                    const { salt1, salt2, g, p } = current_algo;

                    const { A, M1 } = await getSRPParams({
                        g,
                        p,
                        salt1,
                        salt2,
                        gB: srp_B,
                        password: await getPassword(),
                    });

                    return mtproto.call('auth.checkPassword', {
                        password: {
                            _: 'inputCheckPasswordSRP',
                            srp_id,
                            A,
                            M1,
                        },
                    });
                });
            }
        })
        .then(result => {
            console.log('[+] successfully authenticated');
            console.log(result);
            // start listener since the user has logged in now
            startListener()
            res.sendStatus(200)
        });
})

const PORT = process.env.PORT || 3001
app.listen(PORT)

const url = 'wss://iqoption.com/echo/websocket'
let userBalanceId = 0
let amount
let log
let logg
let sessionBalance = 0
let runningActives = []
let runningActivesBinary = []
let runningActivesDigital = []
let runningActivesDigitalFive = []
let StopLoss
let StopWin
let soros
let gale
let ssid
let positionOpenedSoros = false
let positionOpenedGale = false
let binarias = 1
let binariasTimes = "M1,M5"
let digital = 1
let digitalTimes = "M1,M5,M15"
let payout = 0

let winsCount = 0

let payoutMap = new Map()
let buysCount = new Map()
let buyUsersIds = []

const onOpen = () => {
    if (log)
        console.log(`Connected with websocket..`)
}

const onError = error => {
    console.log(`WebSocket error: ${error}`)
}

const messageHeader = (body, name, req = "") => {
    return { 'name': name, 'msg': body, "request_id": req }
}

const subscribeLiveDeal = (name, active_id, type, expirationTime, subsType) => {
    let data
    if (type == 'digital') {
        data = {
            "name": name,
            "params": {
                "routingFilters": {
                    "instrument_active_id": active_id,
                    "expiration_type": "PT" + expirationTime + "M"
                }
            },
            "version": "2.0"
        }
    } else {
        data = {
            'name': name,
            'params': {
                'routingFilters': {
                    'active_id': active_id,
                    'option_type': type
                }
            },
            'version': '2.0'
        }
    }
    ws.send(JSON.stringify(messageHeader(data, subsType)))
}

const buy = (amount, active_id, direction, expired, type, msg) => {
    let data
    if (typeof type == 'number') {
        data = {
            "name": "sendMessage",
            "msg": {
                "body":
                {
                    "price": parseFloat(amount),
                    "active_id": active_id,
                    "expired": expired,
                    "direction": direction,
                    "option_type_id": type,//turbo 1 binary
                    "user_balance_id": userBalanceId
                }
                , "name": "binary-options.open-option", "version": "1.0"
            },
            "request_id": ``
        }
    } else {
        let expirationAt = moment.unix(expired).utcOffset(0).format("YYYYMMDDHHmm")//YYYYMMDDhhmm
        const activeString = getActiveString(active_id, activesMapString)
        const instrumentId = 'do' + activeString + expirationAt + type + direction.toUpperCase().substring(0, 1) + 'SPT'
        data = {
            "name": "sendMessage",
            "msg": {
                "name": "digital-options.place-digital-option",
                "version": "1.0",
                "body": {
                    "user_balance_id": userBalanceId,
                    "instrument_id": instrumentId,
                    "amount": amount.toString()
                }
            }, "request_id": ``
        }
    }

    ws.send(JSON.stringify(data))
}

setInterval(() => {
    // await subs('live-deal-binary-option-placed' , 'unsubscribeMessage')
    // console.log('unsubscribeMessage');
    if (!soros && !gale) {
        runningActives = []
        runningActivesBinary = []
        runningActivesDigital = []
        runningActivesDigitalFive = []
        // auth()
        if (soros)
            positionOpenedSoros = false
        if (gale)
            positionOpenedGale = false
    }
}, 300000);

const getActiveString = (active, map) => {
    for (var [key, value] of map) {
        if (value == active) {
            return key
        }
    }
}


setInterval(() => {
    axios.get('https://schedulertelegram.herokuapp.com/')
}, 250000)

let currentTime
let currentTimemmssDate
let currentTimehhmmss
let currentTimemmss
let buysss = []

const onMessage = e => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message = JSON.parse(e.data)

        if (logg && message.name != 'instrument-quotes-generated' && message.name != 'api_option_init_all_result')
            console.log('RES = ' + e.data)

        if (sessionBalance >= StopWin) {
            console.log('Stop Win Alcançado...')
            ws.terminate()
            schedules = []
            ws = null
            sessionBalance = 0
            stopp = true
        }

        if (buyUsersIds.includes(message.request_id)) {
            if (log)
                console.log('RED = ' + e.data)
            const index = buyUsersIds.indexOf(message.request_id);
            if (index > -1) {
                buyUsersIds.splice(index, 1);
            }
        }

        if (sessionBalance <= StopLoss * -1) {
            console.log('Stop Loss Alcançado...')
            ws.terminate()
            schedules = []
            ws = null
            sessionBalance = 0
            stopp = true
        }

        if (message.name == 'profile' && message.msg) {
            profileStuf(message, 'live-deal-binary-option-placed')
        }

        if (message.name == 'option' && message.status != 0) {
            const active = message.request_id.split('/')[0]
            buysCount.set(parseInt(active), buysCount.get(parseInt(active)) - 1)
            console.log(`Erro ao comprar -> ${getActiveString(`${active}`, activesMapString)}`)
            console.log('RES = ' + e.data)
            if (soros)
                positionOpenedSoros = false
            if (gale)
                positionOpenedGale = false
        }

        if (message.name == 'digital-option-placed' && message.status != 2000) {
            const active = message.request_id.split('/')[0]
            buysCount.set(parseInt(active), buysCount.get(parseInt(active)) - 1)
            console.log(`Erro ao comprar -> ${getActiveString(`${active}`, activesMapString)}`)
            console.log('RES = ' + e.data)
            if (soros)
                positionOpenedSoros = false
            if (gale)
                positionOpenedGale = false
        }

        if (message.name == 'option-closed') {
            optionClosed(message)
        }

        if (message.name == 'position-changed') {
            positionChangedStuff(message)
        }

        if (message.name == 'heartbeat') {
            currentTime = message.msg
            currentTimemmss = moment.unix(currentTime / 1000).utcOffset(-3).add(2, 's').format("HH:mm")
            currentTimemmssDate = moment.unix(currentTime / 1000).utcOffset(-3).add(2, 's').format("YYYY-MM-DD HH:mm:ss")
            currentTimehhmmss = moment.unix(currentTime / 1000).utcOffset(-3).add(2, 'seconds').format("HH:mm:ss")
            if (log)
                console.log(currentTimemmssDate)

        }

        if (schedules.length > 0)
            for (let index = 0; index < schedules.length; index++) {
                const element = schedules[index]
                if (element) {
                    let hourmm = element.time
                    // console.log(hourmm);
                    if (currentTimemmss && currentTimemmss.includes(hourmm)) {
                        const active = element.parInt
                        const direction = element.direction
                        const timeFrame = 5
                        const moment5 = moment(moment().format("YYYY-MM-DD ") + hourmm).utcOffset(0).add(timeFrame, 'm').add(3, 'h').subtract(1,'days').format('X')
                        if (timeFrame && active && direction && moment5) {
                            let turboPayout
                            let digitalPayout
                            if (payoutMap.has('turbo')) {
                                if (payoutMap.get('turbo').has(active)) {
                                    turboPayout = payoutMap.get('turbo').get(active)
                                }
                            }
                            if (payoutMap.has('digital')) {
                                if (payoutMap.get('digital').has(active)) {
                                    digitalPayout = payoutMap.get('digital').get(active)
                                }
                            }

                            console.log(`${currentTimehhmmss} || ${direction} / ${getActiveString(active, activesMapString)} / ${amount}`);

                            if (digitalPayout && turboPayout && digitalPayout > turboPayout) {
                                buy(amount, active, direction, parseInt(moment5), timeFrame == 1 ? "PT1M" : "PT5M")
                            } else if (digitalPayout && turboPayout && digitalPayout <= turboPayout) {
                                buy(amount, active, direction, parseInt(moment5), 3)
                            } else if (turboPayout) {
                                buy(amount, active, direction, parseInt(moment5), 3)
                            } else if (digitalPayout) {
                                buy(amount, active, direction, parseInt(moment5), timeFrame == 1 ? "PT1M" : "PT5M")
                            } else {
                                buy(amount, active, direction, parseInt(moment5), 3)
                            }

                            // console.log(moment(moment().format("YYYY-MM-DD ") + hourmm).utcOffset(0).add(timeFrame, 'm').format('HH:mm:ss'));
                            // console.log(moment(moment().format("YYYY-MM-DD ") + hourmm).utcOffset(0).add(timeFrame * 2, 'm').format('HH:mm:ss'));
                            // console.log(moment(moment().format("YYYY-MM-DD ") + hourmm).utcOffset(0).add(timeFrame * 3, 'm').format('HH:mm:ss'));


                            buysss.push({
                                id: `${active}/${moment5}`,
                                amount,
                                direction,
                                active,
                                lossAmount: 0,
                                timeFrame
                            })
                            // } else {
                            //     console.log('CT operação cancelada...');
                            // }
                        }
                        schedules.splice(index, 1);
                        index--
                    }
                }
            }
    }
}

const getDirection = (msg) => {
    if (msg.toUpperCase().includes('CALL')) {
        return 'CALL'
    } else {
        return 'PUT'
    }
}

const getTimeFrame = (msg) => {
    if (msg.toUpperCase().includes('M15')) {
        return 15
    } else if (msg.toUpperCase().includes('M5')) {
        return 5
    } else {
        return 1
    }
}

const getActiveFor = (msg) => {
    for (var [key, value] of activesMapString) {
        if (msg.toUpperCase().includes(key)) {
            return value
        }
    }
}

function optionClosed(message) {

    let amounth = buysss[0] && buysss[0].amount ? buysss[0].amount : amount
    let active = message.msg.active_id
    let direction = message.msg.direction

    profitAmount = message.msg.profit_amount - amounth
    sessionBalance += profitAmount

    if (profitAmount < 0) {

        console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Binario`)

        if (gale)
            if (amount == amountInitial) {
                // if (!galePut.includes(active)) {
                amount *= 2
            } else {
                amount = amountInitial
            }
        // } else {
        //     let index = galePut.indexOf(parseInt(active))
        //     galePut.splice(index, 1)
        // }
    } else if (profitAmount == 0) {
        console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Binario`)
    } else {
        // if (amount != amountInitial) {
        //     amount = amountInitial
        // } else {
        //     amount += profitAmount
        // }


        console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Binario`)
    }
    positionOpenedSoros = false
}


function positionChangedStuff(message) {
    if (message.msg.status == 'closed') {

        let id = message.msg.id
        let direction = message.msg.raw_event.instrument_dir
        buysCount.set(message.msg.active_id, buysCount.get(message.msg.active_id) - 1)

        if (soros)
            positionOpenedSoros = false
        if (gale)
            positionOpenedGale = false

        let profitAmount = message.msg.close_profit ? message.msg.close_profit - amount : amount * -1
        let active = message.msg.active_id
        sessionBalance += profitAmount

        if (profitAmount < 0) {

            console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Digital`)

        } else if (profitAmount == 0) {
            console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Digital`)
        } else {
            console.log(`${currentTimehhmmss} || ${profitAmount < 0 ? "Loss" : "Win"} ${profitAmount.toFixed(2)} / Balance: ${parseFloat(sessionBalance.toFixed(2))} / ${getActiveString(active, activesMapString) ? getActiveString(active, activesMapString) : active} / Digital`)
        }
        positionOpenedSoros = false
    } else {

    }
}

function profileStuf(message, name) {
    const balances = message.msg.balances
    for (let index = 0; index < balances.length; index++) {
        const element = balances[index]
        if (config.conta == 'demo') {
            if (element.type == 4) {
                message.msg.balance_id = element.id
            }
        }
        else if (config.conta == 'real') {
            if (element.type == 1) {
                message.msg.balance_id = element.id
            }
        }
    }
    userBalanceId = message.msg.balance_id

    subscribePortifolio()

    subs(name, 'subscribeMessage')

}

function subs(name, subsType) {
    if (binarias) {
        for (let i = 0; i < otcActives.length; i++) {
            subscribeLiveDeal(name, otcActives[i], 'turbo', null, subsType)
        }

        if (binariasTimes.includes("M5+"))
            for (let i = 0; i < otcActives.length; i++) {
                subscribeLiveDeal(name, otcActives[i], 'binary', null, subsType)
            }
    }
    if (digital) {
        name = 'live-deal-digital-option'
        if (digitalTimes.includes("M1"))
            for (let i = 0; i < otcActivesDigital.length; i++) {
                subscribeLiveDeal(name, otcActivesDigital[i], 'digital', '1', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 60, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }
        if (digitalTimes.includes("M5"))
            for (let i = 0; i < otcActivesDigital.length; i++) {
                subscribeLiveDeal(name, otcActivesDigital[i], 'digital', '5', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 300, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }

        if (digitalTimes.includes("M15"))
            for (let i = 0; i < otcActivesDigital.length; i++) {
                subscribeLiveDeal(name, otcActivesDigital[i], 'digital', '15', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 900, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }
    }

    if (binarias) {
        name = 'live-deal-binary-option-placed'
        for (let i = 0; i < activesMap.length; i++) {
            subscribeLiveDeal(name, activesMap[i], 'turbo', null, subsType)
        }
        if (binariasTimes.includes("M5+"))
            for (let i = 0; i < activesMap.length; i++) {
                subscribeLiveDeal(name, activesMap[i], 'binary', null, subsType)
            }
    }
    if (digital) {
        name = 'live-deal-digital-option'
        if (digitalTimes.includes("M1"))
            for (let i = 0; i < activesMapDigital.length; i++) {
                subscribeLiveDeal(name, activesMapDigital[i], 'digital', '1', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 60, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }

        if (digitalTimes.includes("M5"))
            for (let i = 0; i < activesMapDigital.length; i++) {
                subscribeLiveDeal(name, activesMapDigital[i], 'digital', '5', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 300, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }

        if (digitalTimes.includes("M15"))
            for (let i = 0; i < activesMapDigital.length; i++) {
                subscribeLiveDeal(name, activesMapDigital[i], 'digital', '15', subsType)
                if (payout)
                    ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": otcActivesDigital[i], "expiration_period": 900, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
            }
    }
}

function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return {
        minutes,
        seconds: parseInt((seconds < 10 ? '0' : '') + seconds)
    }
}



let ws
const activesMap = [108, 7, 943, 101, 7, 943, 101, 944, 99, 107, 2, 4, 1, 104, 102, 103, 3, 947, 5, 8, 100, 72, 6, 168, 105, 212, 945]
const activesMapDigital = [7, 943, 7, 943, 101, 944, 99, 107, 2, 4, 1, 104, 102, 103, 3, 947, 5, 8, 100, 72, 6, 168, 105, 945]
const otcActives = [76, 77, 78, 79, 80, 81, 84, 85, 86]
const otcActivesDigital = [76, 77, 78, 79, 80, 81, 84, 85, 86]
const payoutActives = [108, 7, 943, 101, 7, 943, 101, 944, 99, 107, 2, 4, 1, 104, 102, 103, 3, 947, 5, 8, 100, 72, 6, 168, 105, 212, 76, 77, 78, 79, 80, 81, 84, 85, 86]

const activesMapString = new Map([
    ['AUDCAD', 7],
    ['EURAUD', 108],
    ['EURCAD', 105],
    ['EURNZD', 212],
    ['AUDCHF', 943],
    ['AUDJPY', 101],
    ['AUDNZD', 944],
    ['AUDUSD', 99],
    ['CADCHF', 107],
    ['EURGBP', 2],
    ['EURJPY', 4],
    ['EURUSD', 1],
    ['GBPAUD', 104],
    ['CADJPY', 945],
    ['GBPCAD', 102],
    ['GBPCHF', 103],
    ['GBPJPY', 3],
    ['GBPNZD', 947],
    ['GBPUSD', 5],
    ['NZDUSD', 8],
    ['USDCAD', 100],
    ['USDCHF', 72],
    ['USDJPY', 6],
    ['USDNOK', 168],
    ['EURUSD-OTC', 76],
    ['EURGBP-OTC', 77],
    ['USDCHF-OTC', 78],
    ['EURJPY-OTC', 79],
    ['NZDUSD-OTC', 80],
    ['GBPUSD-OTC', 81],
    ['GBPJPY-OTC', 84],
    ['USDJPY-OTC', 85],
    ['AUDCAD-OTC', 86]
])
const activesDigitalMapString = new Map([
    ['AUDCAD', 7],
    ['AUDCHF', 943],
    ['AUDJPY', 101],
    ['AUDNZD', 944],
    ['AUDUSD', 99],
    ['CADCHF', 107],
    ['EURGBP', 2],
    ['EURJPY', 4],
    ['EURUSD', 1],
    ['EURCAD', 105],
    ['CADJPY', 945],
    ['GBPAUD', 104],
    ['GBPCAD', 102],
    ['GBPJPY', 3],
    ['GBPNZD', 947],
    ['GBPUSD', 5],
    ['NZDUSD', 8],
    ['USDCAD', 100],
    ['USDJPY', 6],
    ['USDNOK', 168],
    ['USDCHF', 72],
    ['EURUSD-OTC', 76],
    ['EURGBP-OTC', 77],
    ['USDCHF-OTC', 78],
    ['EURJPY-OTC', 79],
    ['NZDUSD-OTC', 80],
    ['GBPUSD-OTC', 81],
    ['GBPJPY-OTC', 84],
    ['USDJPY-OTC', 85],
    ['AUDCAD-OTC', 86]
])

const loginAsync = async (ssid) => {
    await doLogin(ssid)
}

const doLogin = (ssid) => {
    return new Promise((resolve, reject) => {
        const int = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                if (log)
                    console.log(JSON.stringify({ 'name': 'ssid', 'msg': ssid, "request_id": "" }))
                ws.send(JSON.stringify({ 'name': 'ssid', 'msg': ssid, "request_id": "" }))
                clearInterval(int)
                resolve()
            }
        }, 800);
    })
}

const getPayout = (type) => {
    return new Promise((resolve, reject) => {
        axios.get(`https://checkpayout.herokuapp.com/payout/${type}`).then((res) => {
            return resolve(res.data)
        }).catch((err) => {
            return resolve(0)
        })
    })
}

setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN)
        intervalGetPayout()
}, 5000);

const intervalGetPayout = async () => {
    let activesPayout = new Map()
    let turbo = await getPayout('turbo')

    if (turbo)
        for (let i = 0; i < turbo.length; i++) {
            if (i % 2 == 0) {
                activesPayout.set(turbo[i], turbo[i + 1])
            }
        }
    payoutMap.set('turbo', activesPayout)
    activesPayout = new Map()

    let binary = await getPayout('binary')
    if (binary)
        for (let i = 0; i < binary.length; i++) {
            if (i % 2 == 0) {
                activesPayout.set(binary[i], binary[i + 1])
            }
        }
    payoutMap.set('binary', activesPayout)
    activesPayout = new Map()

    let digital = await getPayout('digital')
    if (digital)
        for (let i = 0; i < digital.length; i++) {
            if (i % 2 == 0) {
                activesPayout.set(digital[i], digital[i + 1])
            }
        }
    payoutMap.set('digital', activesPayout)
}

intervalGetPayout()

function subscribePortifolio() {
    let data = { "name": "portfolio.position-changed", "version": "2.0", "params": { "routingFilters": { "instrument_type": "digital-option", "user_balance_id": userBalanceId } } }

    ws.send(JSON.stringify(messageHeader(data, 'subscribeMessage')))
}