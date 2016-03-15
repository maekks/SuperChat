/*
Module Dependencies 
*/
var express = require('express'),
    http = require('http'),
    path = require('path'),
    mongoose = require('mongoose'),
    hash = require('./pass').hash;

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var id = 0;
var name;
var WholePassword;
io.on('connection', function(socket){
    socket.on('chat message', function(msg){
      io.emit('chat message', msg);
    });
});


server.listen(3000, function(){
  console.log('listening on *:3000');
});

/*
Database and Models
*/
mongoose.connect("mongodb://localhost/myapp");
var UserSchema = new mongoose.Schema({
    id: Number,
    username: String,
    password: String,
    //color: String,
    salt: String,
    hash: String
});

var User = mongoose.model('users', UserSchema);
/*
Middlewares and configurations 
*/
app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.cookieParser('Authentication Tutorial '));
    app.use(express.session());
    app.use(express.static(path.join(__dirname, 'public')));
    app.set('views', __dirname + '/views');
    app.engine("html",require("ejs").__express);
    app.set('view engine', 'html');
    //app.set('view engine', 'ejs')
    //app.set('view engine', 'jade');
});

app.use(function (req, res, next) {
    var err = req.session.error,
        msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
});
/*
Helper Functions
*/
function authenticate(name, pass, fn) {
    if (!module.parent) console.log('%s have loged in, its password is %s', name, pass);
 
    User.findOne({
        username: name
    },

    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            hash(pass, user.salt, function (err, hash) {
                if (err) return fn(err);
                if (hash == user.hash) return fn(null, user);
                fn(new Error('invalid password'));
            });
        } else {
            return fn(new Error('cannot find user'));
        }
    });

}

function requiredAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

function userExist(req, res, next) {
    User.count({
        username: req.body.username
    }, function (err, count) {
        if (count === 0) {
            next();
        } else {
            req.session.error = "User Exist"
            res.redirect("/signup");
        }
    });
}

/*
Routes
*/
app.get("/", function (req, res) {
    var Userid = 0;
    if (req.session.user) {
        User.findOne({
        username: req.session.user.username
        }, function (err, user) {
        if (user) {
            //Userid = User.get(id);
        }
    });

        res.send("Welcome " + req.session.user.username + "<br>" +"The id is " + Userid + "<br>" +"The password is " + WholePassword + "<br>" + "<a href='/logout'>logout</a>" + "<br>" + "<a href='/chat'>Chatting Page</a>");
        sessionName = req.session.user.username;

    } else {
        res.redirect("/login");
    }
});

app.get("/signup", function (req, res) {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("signup", {title:'User register'});
    }
});

app.post("/signup", userExist, function (req, res) {

    var password = req.body.password;
    WholePassword = req.body.password;
    var username = req.body.username;
    
    hash(password, function (err, salt, hash) {
        if (err) throw err;
        id++;
        var user = new User({
            id: id,
            username: username,
            salt: salt,
            hash: hash,
        });
        console.log(user);
        user.save(function (err, newUser) {
            if (err) throw err;
            authenticate(newUser.username, password, function (err, user){
                if(user){
                    req.session.regenerate(function(){
                        req.session.user = user;
                        req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now can chat <a href="/restricted">/restricted</a>.';
                        res.redirect('/');
                    });
                }
            });
        });
        //try to print and see it
        
    });
});

app.get("/login", function (req, res) {
    res.render("login", {title:'User Login', message: req.session.error});
});

app.post("/login", function (req, res) {
    authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {

            req.session.regenerate(function () {

                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('/');
            });
        } else {
            req.session.error = 'Authentication failed, please check your ' + ' username and password.';
            res.redirect('/login');
        }
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

app.get('/chat', function(req,res){ 
    
    //res.render("chat",{name:"Vince"});
    res.render("chat",{color:"#FFF", name: sessionName});
});

app.get('/profile', requiredAuthentication, function (req, res) {
    res.send('Profile page of '+ req.session.user.username +'<br>'+' click to <a href="/logout">logout</a>' +'<br>');
       
});
