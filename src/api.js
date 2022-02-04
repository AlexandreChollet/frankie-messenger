import http from 'http'

export default class {
    processMessage(message, callback) {
        let data = JSON.stringify({'content': message});

        const options = {
            hostname: process.env.BRAIN_HOST,
            port: process.env.BRAIN_PORT,
            path: '/message/process',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }

        const req = http.request(options, res => {
            let data = ""
            res.on("data", d => {
                data += d
            })
            res.on("end", () => {
                callback(data)
            })
        })

        req.on('error', e => {
           console.log('Erreur : ' + e)
        })

        req.write(JSON.stringify({'content': message}))
        req.end()
    }
}