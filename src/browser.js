import puppeteer from 'puppeteer'
import atob from 'atob'

export default class {
  constructor() {
    this.page = null;
  }

  /**
   * Déploie le bot dans la conversation messenger souhaitée pour le compte facebook configuré.
   * 
   * @param {boolean} show 
   * @param {function} onBotReadyCallback 
   */
  async start(show, onBotReadyCallback) {
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD;
    const conversationId = process.env.CONVERSATION_ID;

    console.log(`Authentification avec ${email} en tant que bot...`)
  
    const browser = await puppeteer.launch({
      headless: !show
    })
    const page = (this.page = (await browser.newPage()));
  
    await page.goto('https://www.facebook.com/login.php', { waitUntil: 'networkidle2' })
    
    await (async function (cb, ...items) {
      return Promise.all(items.map(q => page.$(q))).then(r=>cb(...r))
    })(async (emailField, passwordField, submitButton) => {

      await emailField.type(email)
      await passwordField.type(password)
      let navigationPromise = page.waitForNavigation()
      page.$eval('button[name=login]', elem => elem.click());
      await navigationPromise

      await page.goto('https://www.facebook.com/messages', { waitUntil: 'networkidle2' })
      
      setTimeout(async function() {
          // await page.$eval('a[href="/messages/t/1535178772/"]', elem => elem.click());
          await page.$eval(`a[href="/messages/t/${conversationId}/"]`, elem => elem.click());
          setTimeout(async function() {
              onBotReadyCallback();
          }, 1500);
      }, 1500);

    }, 'input[name=email]', 'input[name=pass]', 'button[name=login]')
  }

  /**
   * @param {string} message 
   */
  async sendMessage(message) {
    console.log('Sending : ' + message)
    const inputElem = await this.page.$('div[aria-label="Écrire un message"]')
    await inputElem.type(message)
    await this.page.$eval('div[aria-label="Appuyer sur Entrée pour envoyer"]', elem => elem.click());
  }

  /**
   * @param {function} callback 
   */
  listen(callback) {
    this.page._client.on(
      'Network.webSocketFrameReceived',
      async ({ timestamp, response: { payloadData } }) => {
        if (payloadData.length > 16) {
          try {
            const json = JSON.parse(atob(payloadData.substr(16)).substr(3))

            let infoPositionInPayload = json.payload.indexOf("_=>LS.sp(\"insertMessage\",") + 9;
            let endOfPayload = json.payload.substring(infoPositionInPayload, json.payload.length - 1);
            let infoEndPositionInPayload = endOfPayload.indexOf("_=>LS.sp", json.payload) - 2;
            
            let argsAsString = ('('.concat(json.payload.substr(infoPositionInPayload, infoEndPositionInPayload)).concat(')'))
              .replace(new RegExp("n\`", 'g'), "\"")
              .replace(new RegExp("`", 'g'), "\"");

            const formattedArgs = argsAsString.replace(/,U/g, '');
            let args = eval('new Array' + formattedArgs);
            
            console.log('Received : ' + args[1])
            await callback({
              message_id: args[10],
              message_content: args[1]
            })
          } catch (e) {
          }
        }
      }
    )
  }
}