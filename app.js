const PORT = process.env.PORT || 8080

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv, {});


/* SERVER CONFIGURATION */
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
serv.listen(PORT);

/* SERVER CONFIGURATION */

/*Game State*/

var STATE = { SOCKET_LIST: {},
              PLAYER_LIST: {},
              OBJECT_LIST: {},
            }
var MAP = { xMin:0,
            yMin:0,
            xMax:500,
            yMax:500

}

/*Game State*/


io.sockets.on('connection', function (socket) {

    socket.id = Math.random()
    let newPlayer = {
                      name:"Anon",
                      x:240,
                      y:240,
                      movingUp: false,
                      movingDown: false,
                      movingRight: false,
                      movingLeft: false,
                      tail: [],
                      collider:[],
                      dead: false,
                      cd:1,

                    }
    STATE.PLAYER_LIST[socket.id] = newPlayer
    STATE.SOCKET_LIST[socket.id] = socket;
    newPlayer.tail.push(tailPiece(newPlayer))
    newPlayer.tail.push(tailPiece(newPlayer))
    newPlayer.tail.push(tailPiece(newPlayer))

    socket.on('changeName', function (date){
      newPlayer.name = date.name
    })


    socket.on('keyPress', function (data){
    if(newPlayer.cd === 1){
      if(data.inputId == "down" && newPlayer.movingUp === false){
        newPlayer.movingDown = data.state
          newPlayer.movingUp = false
          newPlayer.movingRight = false
          newPlayer.movingLeft = false
          newPlayer.cd = 0

      }
      if(data.inputId == "up" && newPlayer.movingDown === false){
        newPlayer.movingUp = data.state
          newPlayer.movingDown = false
          newPlayer.movingRight = false
          newPlayer.movingLeft = false
          newPlayer.cd = 0
      }
      if(data.inputId == "right" && newPlayer.movingLeft === false){
        newPlayer.movingRight = data.state
        newPlayer.movingDown = false
        newPlayer.movingUp = false
        newPlayer.movingLeft = false
        newPlayer.cd = 0
      }
      if(data.inputId == "left" && newPlayer.movingRight === false){
        newPlayer.movingLeft = data.state
        newPlayer.movingDown = false
        newPlayer.movingUp = false
        newPlayer.movingRight= false
        newPlayer.cd = 0
      }
    }
  })


    socket.on('disconnect', function(){
      delete STATE.SOCKET_LIST[socket.id]
      delete STATE.PLAYER_LIST[socket.id]

    })

})


const tailPiece = function (snake) {
  piece = { x:snake.x, y: snake.y }
  return piece
}
const calculatePositions = function (){
  for(let p in STATE.PLAYER_LIST){
    let snake = STATE.PLAYER_LIST[p]
    for(var i = snake.tail.length - 1; i >0 ; i-- ){
        snake.tail[i].x = snake.tail[i-1].x
        snake.tail[i].y = snake.tail[i-1].y
    }
    snake.tail[0].x = snake.x
    snake.tail[0].y = snake.y

    if (snake.movingDown === true ){
      snake.y = snake.y + 20;
    }
    if (snake.movingUp === true ){
      snake.y = snake.y - 20;
    }
    if (snake.movingRight === true ){
      snake.x = snake.x + 20;
    }
    if (snake.movingLeft === true ){
      snake.x = snake.x - 20;
    }
  }
}
var findHead = function (object){
  head = {
    x: object.x +10,
    y: object.y +10
  }
  return head
}
var detectCollisions = function (){
  for(let p in STATE.PLAYER_LIST){
    let player = STATE.PLAYER_LIST[p]
    let head = findHead(player)
    if(head.x > MAP.xMax){
      player.dead= true
      delete STATE.SOCKET_LIST[player.id]
      delete STATE.PLAYER_LIST[player.id]
    }
    if(head.y > MAP.yMax){
      player.dead= true
      delete STATE.SOCKET_LIST[player.id]
      delete STATE.PLAYER_LIST[player.id]
    }
    if(head.y < MAP.yMin){
      player.dead= true
      delete STATE.SOCKET_LIST[player.id]
      delete STATE.PLAYER_LIST[player.id]
    }
    if(head.x < MAP.xMin){
      player.dead= true
      delete STATE.SOCKET_LIST[player.id]
      delete STATE.PLAYER_LIST[player.id]
    }

    for(let j in STATE.PLAYER_LIST){
      let ePlayer = STATE.PLAYER_LIST[j]
      for(let i = ePlayer.tail.length - 1; i >0 ; i-- ){
        if((player.movingUp === true || player.movingDown === true || player.movingLeft === true || player.movingRight === true) && findHead(ePlayer.tail[i]).x === head.x && findHead(ePlayer.tail[i]).y === head.y){
          player.dead= true
          delete STATE.SOCKET_LIST[player.id]
          delete STATE.PLAYER_LIST[player.id]
        }
      }
    }
    for(let o in STATE.OBJECT_LIST){
      let object = STATE.OBJECT_LIST[o]
        if(head.x === object.head.x && head.y === object.head.y ){
          player.tail.push(tailPiece(player));
          let newX = Math.floor(Math.random() * 24) * 20;
          let newY = Math.floor(Math.random() * 24) * 20;
          STATE.OBJECT_LIST[o] = {id: object.id, x: newX, y:newY, head:{ x: newX+10, y: newY+10}}
        }
    }
  }
}

var newObject = { id: Math.random, x: 0, y:0, head:{ x:10, y: 10} }
var otherObject = { id: Math.random +1 , x: 480, y:480, head:{ x:490, y: 490} }

STATE.OBJECT_LIST[newObject.id] = newObject
STATE.OBJECT_LIST[otherObject.id] = otherObject
setInterval(function(){
 var statePack = []

 calculatePositions()
 detectCollisions()
 for( var i in STATE.PLAYER_LIST){
   let thePlayer = STATE.PLAYER_LIST[i];
   if(thePlayer.dead === false){
     thePlayer.cd = 1;
     statePack.push({
       name: thePlayer.name,
       x:thePlayer.x,
       y:thePlayer.y,
       tail: thePlayer.tail,
       team: "player"

     })
   }else{
     delete STATE.PLAYER_LIST[i]
   }
 }

  for(var i in STATE.OBJECT_LIST){
    object = STATE.OBJECT_LIST[i]
    statePack.push({
      x:object.x,
      y:object.y,
      tail:{},
      team: "enemy"
    })
  }


 for(var i in STATE.SOCKET_LIST){
   let socket = STATE.SOCKET_LIST[i];
   socket.emit('newPosition', statePack)
 }


}, 125);
