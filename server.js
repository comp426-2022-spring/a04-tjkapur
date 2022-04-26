// require Express.js
const express = require('express')
const app = express()
// require morgan
const morgan = require('morgan')
// require fs
const fs = require('fs')
// require database script file
const logdb = require('./database.js')
// Make express use its own built-in body parser
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

const cors = require('cors')
// take an arbitrary port number as a command line argument 
// Default: 5000
const args = require('minimist')(process.argv.slice(2))

const port = args.port || process.env.PORT || 5000

// start app server
const server = app.listen(port, () => {
  console.log('App listening on port %PORT%'.replace('%PORT%', port))
})

const help = (`
server.js [options]
--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help	Return this message and exit.
`)

if(args.help || args.h) {
  console.log(help)
  process.exit(0)
}

if(args.log == 'false') {
  console.log("dont create log")
} else {

    const accesslog = fs.createWriteStream('access.log', { flags: 'a'})
    app.use(morgan('combined', {stream: accesslog}))
}
app.use((req, res, next) => {
    let logdata = {
      remoteaddr: req.ip,
      remoteuser: req.user,
      time: Date.now(),
      method: req.method,
      url: req.url,
      protocol: req.protocol,
      httpversion: req.httpVersion,
      status: res.statusCode,
      referer: req.headers['referer'],
      useragent: req.headers['user-agent']
    }

    const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
    
    next()
})

app.use(cors())

if(args.debug) {
  app.get('app/log/access', (req, res) => {
      const stmt = logdb.prepare('SELECT * FROM accesslog').all()
      res.status(200).json(stmt)
  })
  app.get('/app/error', (req, res) => {
    throw new Error("Error test successful")
  })
}

app.get('/app/log/access', (req, res) => {
      const stmt = logdb.prepare('SELECT * FROM accesslog').all()
      res.status(200).json(stmt)

})

app.get('/app/error', (req, res) => {
  throw new error ('Error test successful')
})

//2202-03-08 comp 426
//CREATE a new user (HTTP method post) at endpoint /app/new/
app.post('/app/new/user', (req, res, next) => {
    let data = {
    user: req.body.username,
    pass: req.body.password
    }
    const stmt = logdb.prepare('INSERT INTO userinfo (username, password) VALUES (?, ?)')
    const info = stmt.run(data.user, data.pass)
    res.status(200).json(info)
})

// Read a list of users (HTTP method GET) 
app.get('/app/users', (req, res) => {
    try {
      const stmt = logdb.prepare('SELECT * FROM userinfo').all()
      res.status(200).json(stmt)
    } catch (e) {
      console.error(e)
    }
})

// Read a single user (HTTP method GET)
app.get('/app/user/:id', (req, res) => {
  try {
      const stmt = logdb.prepare('SELECT * FROM userinfo WHERE id = ?').get(req.params.id)
      res.status(200).json(stmt)
  } catch (e) {
      console.error(e)
  }
})
// update a single user (HTTP method Patch)
app.patch('/app/update/user/:id', (req, res) => {
  let data = {
    user: req.body.username,
    pass: req.body.password
  }
  const stmt = logdb.prepare('UPDATE userinfo SET username = COALESCE(?,username), password = COALESCE(?, password) WHERE id = ?')
  const info = stmt.run(data.user, data.pass, req.params.id)
  res.status(200).json(info)
})

//delete a single user (HTTP method delete)
app.delete('/app/delete/user/:id', (req, res) => {
    const stmt = logdb.prepare('DELETE FROM userinfo WHERE id = ?')
    const info = stmt.run(req.params.id)
    res.status(200).json()
})

//Define base endpoint
app.get('/app/', (req, res) => {
    res.statusCode=200 //respond with status 200
    res.statusMessage='OK' //respond with status message "OK"
    res.writeHead(res.statusCode, {'Content-Type' : 'text/plain'})
    res.end(res.statusCode + ' ' + res.statusMessage)
})

// unless specified :varaible will be anyinput
app.get('/app/echo/:number',  (req, res) => {
    res.status(200).json({ 'message': req.params.number})
})

// /app/flip/ will be used to tesst single flip without import coin.mjs
app.get('/app/flip/', (req, res) => {
  const flip = coinFlip()
  res.status(200).json({ 'flip': flip})
})

// /app/flips/:number is many flips 
app.get('/app/flips/:number', (req, res) => {
  const flips = coinFlips(req.params.number)
  const tails = countTails(flips)
  const heads = countHeads(flips)
  res.status(200).json({'raw': flips, 'summary': {'heads': heads, 'tails': tails}})
})

// /app/flip/call/heads filp a coing with a call to heads
app.get('/app/flip/call/heads', (req, res) => {
  const str = 'heads'
  const flip = coinFlip()
  const result = win(flip, str)
  res.status(200).json({ 'call': str, 'flip': flip, 'result': result})
})

// /app/flip/call/tails filp a coing with a call to tails
app.get('/app/flip/call/tails', (req, res) => {
const str = 'tails'
const flip = coinFlip()
const result = win(flip, str)
res.status(200).json({ 'call': str, 'flip': flip, 'result': result})
})

//Define default endpoint
//default response for any other request
app.use(function(req, res) {
  res.status(404).send('404 NOT FOUND')
})



// Functions

function coinFlip() {
  let x = Math.random()
  if(x >= 0.5) {
    return 'heads'
  } else {
    return 'tails'
  }
}

function coinFlips(number) {
  var tosses = []
  for (var i = 0; i < number; i++) {
    tosses.push(coinFlip())
  }
  return tosses
}

function countFlips(array) {
  let count_tails = 0
  let count_heads = 0
  for(let i = 0; i < array.length; i++) {
    if(array[i] == 'tails') {
      count_tails++;
    } else if(array[i] == 'heads') {
      count_heads++;
    }
  }

  if(count_tails == 0) {
    return('{ heads: ' + count_heads + ' }')
  } else if (count_heads == 0) {
    return('{ tails: ' + count_tails + ' }')
  } else {
  return('{ heads: ' + count_heads + ', tails: ' + count_tails + ' }')
  }
}

/** Flip a coin!
 * 
 * Write a function that accepts one input parameter: a string either "heads" or "tails", flips a coin, and then records "win" or "lose". 
 * 
 * @param {string} call 
 * @returns {object} with keys that are the input param (heads or tails), a flip (heads or tails), and the result (win or lose). See below example.
 * 
 * example: flipACoin('tails')
 * returns: { call: 'tails', flip: 'heads', result: 'lose' }
 */

function flipACoin(call) {
  if(call == null) {
    return('Error: no input') //return error no input
  }
  if(call == 'heads' || call == 'tails') {
    let flip = coinFlip()
    let result = 'lose'
    if(flip == call) {
      result = 'win'
    }
    return("{ call: '" + call + "', flip: '" + flip + "', result: '" + result + "' }")
  } else {
    return('Usage: node guess-flip.js --call= [heads | tails]')

  }
  
}

function win(flip, call) {
  let result = 'lose'
  if(flip == call) {
    result = 'win'
  }
  return(result)
}

function countTails(flips) {
  let countT = 0;
  for(var i = 0; i < flips.length; i++) {
    if(flips[i] == 'tails') {
      countT++;
    }
  }

  return countT
}

function countHeads(flips) {
  let countH = 0;
  for(var i = 0; i < flips.length; i++) {
    if(flips[i] == 'heads') {
      countH++;
    }
  }

  return countH
}