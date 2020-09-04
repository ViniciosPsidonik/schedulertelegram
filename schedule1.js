const { MTProto, getSRPParams } = require('./core/index');
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

const api_id = 1537314 // insert api_id here
const api_hash = '1855b411a187811b71f333d904d725d9'; // insert api_hash here

async function getPhone() {
    return (await prompts({
        type: 'text',
        name: 'phone',
        message: 'Enter your phone number:'
    })).phone
}
let code
app.post('/code', (req, res) => {
    let params = req.body

    code = params.code
})


function getCode() {
    return new Promise((resolve) => {
        if (code) {
            return resolve(code)
        }
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

function startListener() {
    console.log('[+] starting listener')
    mtproto.updates.on('updates', ({ updates }) => {
        const newChannelMessages = updates.filter((update) => update._ === 'updateNewChannelMessage').map(({ message }) => message) // filter `updateNewChannelMessage` types only and extract the 'message' object

        for (const message of newChannelMessages) {
            // printing new channel messages
            console.log(`[${message.to_id.channel_id}] ${message.message}`)
        }
    });
}

function sendCode(phone) {
    return api.call('auth.sendCode', {
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
    console.log('[+] You must log in')
    mtproto.call('auth.sendCode', {
        phone_number: '+5554991972360',
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
            mtproto.call('auth.signIn', {
                phone_code: codeHere,
                phone_number: phone_number,
                phone_code_hash: result.phone_code_hash,
            }).then(async result => {
                console.log('[+] successfully authenticated');
                console.log(result);
                // start listener since the user has logged in now
                startListener()
            });
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
            res.sendStatus(200)
        });
})

const PORT = process.env.PORT || 3001
app.listen(PORT)