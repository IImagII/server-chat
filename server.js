// import express from 'express'
// import { Server } from 'socket.io'
// import { createServer } from 'http'

// import cors from 'cors'
// import dotenv from 'dotenv'

const cors = require('cors')
const dotenv = require('dotenv')

const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {
   cors: {
      origin: '*',
      methods: ['GET', 'POST'],
   },
})

// const app = express()
app.use(cors({ origin: '*' })) // обязательно сделать так чтобы разрешалось все

// const server = createServer(app) // тут мы показываем что наш сервер работает через наше приложение
// const io = new Server(server) //подключили к нашему серверу webSocket
dotenv.config() // это делаем для переменных

//Переменные из .env
const PORT = process.env.PORT || 5000

app.use(express.json()) // для того чтобы воспринимать формат json
app.use(express.urlencoded({ extended: true })) //это делается для того чтобы можно было понимать что передается в URL запросе(и мы могли считать query)

const rooms = new Map()

// для того чтобы отправить json файл ответ на клиент и тут мы отпрвляем нашу комнату и все сообщения это делается когда только заходишь в комнату для нового пользователя
app.get('/rooms/:id', (req, res) => {
   const room = req.params.id

   const obj = rooms.has(room)
      ? {
           users: [...rooms.get(room).get('users').values()],
           messages: [...rooms.get(room).get('messages').values()],
        }
      : { users: [], messages: [] }
   res.json(obj)
})

//для того чтобы принимать данные с клиента
app.post('/rooms', (req, res) => {
   const { room, userName } = req.body //вытаскиваем то что к нам пришло с сервера
   //делаем условие а есть ли таккая комната
   if (!rooms.has(room)) {
      rooms.set(
         room,
         new Map([
            ['users', new Map()],
            ['messages', []],
         ])
      )
   }

   res.send()
})

//проверяем подключен ли человек к webScocket
io.on('connection', socket => {
   //имеенно socket слушает ROOM:JOIN это нужно чтобы выбрать комнату
   socket.on('ROOM:JOIN', ({ room, userName }) => {
      //*вводим информацию о том в какую комнату конктерно мы вошли и подключаемся к ней
      socket.join(room)

      //*мы подключаемся к импровизированной комнате к базе данных у нас это просто new Map()
      rooms.get(room).get('users').set(socket.id, userName)

      //*оповещаем других пользователей что подключен новый пользователь
      const users = [...rooms.get(room).get('users').values()]

      //такой записью мы отправляем  пользователям конкретной комнаты(room) что вошел новый пользователь
      socket.broadcast.to(room).emit('ROOM:JOINED', users)
   })

   //отключение пользователя
   socket.on('disconnect', () => {
      rooms.forEach((value, room) => {
         if (value.get('users').delete(socket.id)) {
            //*оповещаем других пользователей что подключен новый пользователь
            const users = [...rooms.get(room).get('users').values()]
            //пишем новыйсокет по отслеживанию удаления пользователя
            socket.broadcast.to(room).emit('ROOM:SET_LEAVE', users)
         }
      })
   })

   //добавление сообщений
   socket.on('ROOM:NEW_MESSAGE', ({ room, userName, text }) => {
      const obj = { userName, text }

      //находим комнату в нашем массивек комнат находим все сообщения и выводим их и так как у нас не new Map()мы просто добавляем новое сообщение с помощью push
      rooms.get(room).get('messages').push(obj)

      //такой записью мы отправляем  пользователям конкретной комнаты(room) новое сообщение и имя кто это написал всем кроме меня
      socket.to(room).emit('ROOM:NEW_MESSAGE', obj)
   })
})

server.listen(PORT, error => {
   //если ошибка есть то верни нам ошибку то есть делаем проверку на ошибки
   if (error) {
      throw Error(error)
   }
   console.log(`Сервер запущен на порту ${PORT}`)
})
