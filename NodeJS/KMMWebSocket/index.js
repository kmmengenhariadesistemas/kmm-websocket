
var app = require('express')();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 4327;
var crypto = require("crypto");

var kmmMiddleware = require('./middleware/kmm');
app.use(bodyParser.text({ type: '*/xml' }));
app.use(kmmMiddleware.xmlParser);

app.get('/', function(req, res){
  console.log(new Date().toISOString()+" Index Access", req.body);
  res.sendFile(__dirname + '/index.html');
});
app.get('/healthchecker', (req, res) => {
  console.log(new Date().toISOString()+" Health Checking", req.body);
  res.status(200).respond({status:'OK'});
})
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.post('/send', (req, res) => {
  if (req.body == null || req.body.room == null || req.body.emit == null || req.body.message == null) {
    res.status(400).respond({message: "Invalid Message"});
    console.log(new Date().toISOString()+" Invalid post message", req.body);
    return;
  }
  if (req.body != null && req.body.room == "broadcast") {
    console.log(new Date().toISOString()+" Post broadcast message send")
    io.emit(req.body.emit, req.body);
  } else {
    console.log(new Date().toISOString()+" Post message send", req.body.room);
    io.sockets.in(req.body.room).emit(req.body.emit, req.body);
  }
  res.respond({status: "OK"});
});

var authClients = {}
function isAuthenticated(socket) {
  if (!!authClients[socket.id]) {
     return true;
  }
  return false;
}

function findRooms() {
  let availableRooms = {};
  let rooms = io.sockets.adapter.rooms;
  if (rooms) {
    for (let room in rooms) {
      if (Object.keys(io.sockets.sockets).indexOf(room) == -1) {
        availableRooms[room] = rooms[room];
      }
    }
  }
  return availableRooms;
}

io.on('connection', function(socket){
  console.log(new Date().toISOString()+' New connection', socket.id);
  socket.on('auth', (msg) => {
    let dados = msg;
    if (dados.token != null) {
      // Validar o token
      let token = dados.token;
      let tokenParts = token.split(".");
      if (tokenParts.length >= 2) {
        // Tenta interpretar o token para verificar se eh um token válido
        // Seria interessante melhorar para validar o hash do token

        try {
          let payload = JSON.parse(new Buffer(tokenParts[0], 'base64').toString("ascii"));
          authClients[socket.id] = dados.token;
          console.log(new Date().toISOString()+" Connection authenticated", socket.id)
          socket.emit('authenticated', { status: "OK" });
        } catch(e) {
          console.log(new Date().toISOString()+" Authentication failed", { socket: socket.id, token: token })
          socket.emit('unauthorized', {  message: "Invalid authentication" });
        }
      } else {
        console.log(new Date().toISOString()+" Authentication failed", { socket: socket.id, token: token })
        socket.emit('unauthorized', {  message: "Invalid authentication" });
      }
    } else {
      console.log(new Date().toISOString()+" Authentication failed", { socket: socket.id, token: null })
      socket.emit('unauthorized', { message: "Invalid authentication" });
    }
  });

  socket.on('disconnecting', function(){
    //authClients[socket.id] = null;
    //console.log('Session disconnected', socket.id);
    Object.keys(socket.rooms).forEach(room => {
      if (Object.keys(io.sockets.sockets).indexOf(room) == -1) {
        socket.in('room-monitor').emit('message', {op:'leave', room: room, socket: socket.id });
        if (Object.keys(io.sockets.adapter.rooms[room].sockets).length == 1) {
          socket.in('room-monitor').emit('message', {op:'leaveRoom', room: room });
        }
      }
    })
  });

  socket.on('disconnect', function(){
    delete authClients[socket.id];
    console.log(new Date().toISOString()+' Session disconnected', socket.id);
    //console.log(socket.rooms);
  });

  socket.on('sendMessage', function(dados){
    if (!isAuthenticated(socket)) {
       console.log(new Date().toISOString()+" Invalid send message: Unauthorized", socket.id);
       socket.emit('unauthorized', { message: "Not authenticated" });
       return;
    }
    if (!dados.room || !dados.message) {
       console.log(new Date().toISOString()+" Invalid send message: Invalid format", socket.id);
       socket.emit('fail', { message: "Invalid format" });
       return;
    }

    console.log(new Date().toISOString()+" Sending message on room: "+dados.room, dados);
    io.sockets.in(dados.room).emit('message', dados);
  });
  socket.on("joinRoom", function(msg) {
    if (!isAuthenticated(socket)) {
       console.log(new Date().toISOString()+" Invalid joinRoom: Unauthorized", socket.id);
       socket.emit('unauthorized', { message: "Not authenticated" });
       return;
    }
    console.log(new Date().toISOString()+" Joining room: "+msg, socket.id);
    socket.join(msg);
    io.sockets.in("room-monitor").emit('message', { op: 'join', room: msg, socket: socket.id })
    if (msg == "room-monitor") {
      // Sends actual status of rooms

      //console.log(findRooms());
      //console.log('sockets', io.sockets);
      socket.emit('message', { op: 'list', rooms: findRooms() })
    }
  });
  socket.on("leaveRoom", function(msg) {
    if (!isAuthenticated(socket)) {
       console.log(new Date().toISOString()+" Invalid leaveRoom: Unauthorized", socket.id);
       socket.emit('unauthorized', { message: "Not authenticated" });
       return;
    }
    console.log(new Date().toISOString()+" Leaving room: "+msg, socket.id);
    socket.in('room-monitor').emit('message', {op:'leave', room: msg, socket: socket.id });
    if (Object.keys(io.sockets.adapter.rooms[msg].sockets).length == 1) {
      socket.in('room-monitor').emit('message', {op:'leaveRoom', room: room });
    }
    socket.leave(msg);
    
  });
});

http.listen(port, function(){
  console.log(new Date().toISOString()+' listening on *:' + port);
});

setInterval(() => {
  let used = process.memoryUsage();
  for (let key in used) {
    console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}, 10000);
