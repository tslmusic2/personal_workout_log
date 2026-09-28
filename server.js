import http from 'node:http'
import { getRequestBody } from './utilities/getRequestBody.js'
import { sendJson } from './utilities/responses.js'

const PORT = 8006




const server = http.createServer((req, res) => {




})

server.listen(PORT, () => console.log(`Connected on port: ${PORT}`))