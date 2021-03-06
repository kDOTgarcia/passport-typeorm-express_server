import * as express from 'express';
import * as session from "express-session";

import { createConnection } from "typeorm";
import "reflect-metadata";
import { User } from './entities/User';

import * as passport from "passport";
import { Strategy } from "passport-local";

import * as bodyParser from 'body-parser';

import * as argon2 from "argon2";

import * as redis from "redis";
var RedisStore = require("connect-redis")(session);
var client = redis.createClient();

var path = require('path');

createConnection({
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "admin",
    "password": "password",
    "database": "accounts",
    "synchronize": true,
    "logging": false,
    "entities": [
        User
    ]
}).then(async (connection) => {
    var userRepository = connection.getRepository(User);

    passport.use(new Strategy(async (username: string, password: string, done) => {
        const user = await userRepository.findOne({ username: username });

        if (user !== null) {
            return argon2.verify(user.password, password).then((res) => {
                if (res == true) {
                    return done(null, user)
                }
            })
        }
    }));

    passport.serializeUser((user: User, cb) => {
        cb(null, user.id);
    });

    passport.deserializeUser(async (id: any, cb) => {
        const user = await userRepository.findByIds(id);
        cb(null, user);
    });

    const server = express();
    server.use(session({
        secret: "averysecretsecret",
        cookie: {
            maxAge: 15000
        },
        store: new RedisStore({host: 'localhost', port: 6379, client: client}),
        saveUninitialized: true,
        resave: false
    }));

    server.use(express.static('public'));
    server.use(bodyParser.urlencoded({ extended: false }))
    server.use(bodyParser.json({ strict: false }));

    server.use(passport.initialize());
    server.use(passport.session());

    server.get("/login", (req, res) => {
        res.sendFile(path.join(__dirname + '/views/login.html'))

    })

    server.post("/logout", (req, res) => {
        req.session.destroy((err) => {
            console.log(err)
        });

        res.redirect("/login")
    })
    
    server.post("/login",
        passport.authenticate('local', { session: false }), (req, res) => {
            req.session.key = (req.user as User).username;
            res.redirect("/home")
    })

    server.post("/create", async (req, res) => {
        await argon2.hash(req.body.password).then((hash) => {
            user.password = hash.toString()
        });

        const user = new User();
        user.username = req.body.username;
        userRepository.save(user);
        res.redirect('/login')
    })

    server.get("/home", async (req, res) => {
        if (req.session.key) {
            res.sendFile(path.join(__dirname + '/views/home.html'))
        } else {
            res.redirect("/login")
        }
    })

    server.listen(3001, () => {
        console.log("Server started, listening on port 3001...")
    })
}).catch(error => console.log(error))