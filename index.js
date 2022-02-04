import Api from './src/api.js'
import HeadlessBrowser from './src/browser.js'
import dotenv from 'dotenv'
import staticConfig from './config/static.js'
import Queue from './src/queue.js'

dotenv.config();

let api = new Api();
let queue = new Queue();
let browser = new HeadlessBrowser();
browser.start(true, async () => {
    // Bot déployé
    let possibleSentences = staticConfig.bot.wakeUpSentences;
    let wakeUpSentence = possibleSentences[Math.floor(Math.random() * possibleSentences.length)];

    let dt = new Date();
    await browser.sendMessage(
        'Started bot <' + process.env.BOT_NAME + '> ' 
        + '[' 
            +'time: ' + `${
                dt.getDate().toString().padStart(2, '0')}/${
                (dt.getMonth()+1).toString().padStart(2, '0')}/${
                dt.getFullYear().toString().padStart(4, '0')} ${
                dt.getHours().toString().padStart(2, '0')}:${
                dt.getMinutes().toString().padStart(2, '0')}:${
                dt.getSeconds().toString().padStart(2, '0')
            }`
        + ']')
    await browser.sendMessage(wakeUpSentence);

    // Écoute des messages entrant
    await browser.listen((json) => {
        if(typeof json.message_content === 'undefined') {
            console.log('/!\\ Unsupported message type.');
            return;
        }

        if(!json.message_content.includes('@' + process.env.BOT_NAME)) {
            return;
        }
        json.message_content = json.message_content.replace('@' + process.env.BOT_NAME, '').trim()

        queue.enqueue(async () => await new Promise((res) => api.processMessage(json.message_content, (reply) => {
            let result = JSON.parse(reply)
            if(result.reply !== null) {
                browser.sendMessage(result.reply)
                    .then(() => {
                        res();
                    })
                    .catch(() => {
                        res();
                    });
            }
        })));
    });
})