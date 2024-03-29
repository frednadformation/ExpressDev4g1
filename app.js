var express = require('express');
var app = express();
//Middleware pour recuperer la donnée
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));

//fichier de configarition
require('dotenv').config();

// var path = require('path');
//Connexion mongodb :
var mongoose = require('mongoose'); 
const url = process.env.DATABASE_URL;

mongoose.connect(url)
.then(console.log("Mongodb connected"))
.catch(err => console.log(err));

//Systeme de vue EJS
app.set('view engine', 'ejs');

//Mettre a disposition les données et les rendres accessible pour le front
const cors = require('cors');
//De base
// app.use(cors());
//Transmettre TOUT type de données meme sensible (JWT)
app.use(cors({credentials: true, origin: process.env.FRONTEND_URL}));


//Method put et delete pour express
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

//bcrypt : hashage de mot de passe

const bcrypt = require('bcrypt');

//Cookie parser : passage des données en cookie
const cookieParser = require('cookie-parser')
app.use(cookieParser());

//Import JWT
const {createTokens, validateToken} = require('./JWT');

//Import jwt decode
const {jwtDecode} = require('jwt-decode');

//Multer 
const multer = require('multer')
app.use(express.static('uploads'));

const storage = multer.diskStorage({
    destination : (req, file, cb) =>{
        cb(null, 'uploads/')
    },
    filename : (req, file, cb) =>{
        cb(null, file.originalname);
    }
})
const upload = multer({storage})

//Sécurité
//toobusy
const toobusy = require('toobusy-js');

app.use(function(req, res, next) {
    if(toobusy()){
        res.status(503).send("Server too busy")
    }
    else{
        next();
    }
})
//Svg Captcha
const session = require('express-session');
const svgCaptcha = require('svg-captcha');
app.use(
    session({
        secret: "Mysecretkey", //Identifie de façon unique la session
        resave: false,
        saveUninitialized: true
    })
)

app.get('/captcha', (req, res) => {
    const options = {
        size: 4,
        noise : 1,
        color: true
    }
    const captcha = svgCaptcha.create(options); //genere l'image

    req.session.captcha = captcha.text; //on stock le text obtenu dans la session
    res.type('svg');
    res.status(200).send(captcha.data);

})

app.get('/formCaptcha', (req, res) => {
    res.render('Captcha');
});

app.post('/verify', (req, res)=>{
    const {userInput} = req.body;
    if(userInput === req.session.captcha){
        res.status(200).send('Captcha is valid')
    }
    else{
        res.status(400).send('Captcha is invalid !')
    }
})

// hpp - polution des parametres http

const hpp = require('hpp');

app.use(hpp());

// Helmet - modification des entete http

const helmet = require('helmet');

app.use(helmet());


//No cache - cache control : éviter que les données soit stockées en cache
const nocache = require('nocache');
app.use(nocache());






//Documentation Swagger

// const swaggerJsDoc = require('swagger-jsdoc')
// const swaggerUI = require('swagger-ui-express')

// const swaggerOptions = {
//     swaggerDefinition : {
//         info : {
//             title : 'backend API Documentation',
//             version : '1.0',
//         }
//     },
//     apis : ['app.js']
// }

// const swaggerDocs = swaggerJsDoc(swaggerOptions);
// console.log(swaggerDocs);

// app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

const swaggerUI = require('swagger-ui-express');

const swaggerDocs = require("./swagger-output.json");

console.log(swaggerDocs);

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));


//Models :

var Contact = require('./models/Contact');

app.post('/uploadimage', upload.single('image'), function(req, res){
    if(!req.file){
        res.status(400).json("No file uploaded!");
    }
    else{
        res.json("File uploaded!");
    }
})

app.post('/uploadmultiple', upload.array('images', 5), function(req, res) {
    if(!req.files || req.files.length === 0) {
        res.status(400).json("No files uploaded!");
    }
    else {
        res.json("File uploaded!");
    }
});

//Contact
app.get('/', validateToken, function(req, res){
    // res.sendFile(path.resolve('index.html'));
    Contact.find()
    .then((data)=>{
        console.log(data);
        // res.render('Home', {data: data});
        res.json(data);
    })
    .catch(err => console.log(err));
});

app.get('/newContact', function(req, res){
    res.render('NewContact');
});

app.get('/contact/:id', function(req, res){
    Contact.findOne({
        _id : req.params.id
    })
    .then((data)=>{
        // res.render('Edit', {data: data});
        res.json(data);
    })
    .catch(err => console.log(err));
});

app.post('/submit-data', function(req, res){
    var name = req.body.firstname + ' ' + req.body.lastname;
    res.send(name + ' Submitted successfully');
})

app.post('/submit-contact', function(req, res){
    const Data = new Contact({
        nom : req.body.nom,
        prenom : req.body.prenom,
        email : req.body.email,
        message : req.body.message
    })

    Data.save()
    .then(()=>{
        console.log("Data saved successfully");
        res.redirect(process.env.FRONTEND_URL);
    })
    .catch(err=>{
        console.log(err);
    });
});

app.put('/edit/:id', function(req, res){
    const Data = {
        nom : req.body.nom,
        prenom : req.body.prenom,
        email : req.body.email,
        message : req.body.message
    }
    Contact.updateOne({_id : req.params.id}, {$set: Data})
    .then(()=>{
        console.log("Data updated successfully");
        res.redirect('/'); 
    })
    .catch(err=>{console.log(err);});
})

app.delete('/delete/:id', function(req, res){
    Contact.findOneAndDelete({
        _id : req.params.id
    })
    .then(()=>{
        console.log("Data deleted successfully");
        res.redirect('/'); 
    })
    .catch(err=>{console.log(err);});
})

//Blog
var Blog = require('./models/Blog');
//affichage formulaire nouveau blog
app.get('/newblog', function(req, res){
    res.render('NewBlog')
});

//Ajout d'un blog

/**
 * @swagger
 * /addblog:
 *          post:
 *              description: add a new blog
 *              parameters:
 *              - titre: title
 *                description: title of the new blog
 *                in: formData
 *                required: false
 *                type: String
 *              - sousTitre: subtitle
 *                description: subtitle of the new blog
 *                in: formData
 *                required: false
 *                type: String
 *              responses:
 *                  201:
 *                     description: Created
 */
app.post('/addblog',function(req, res){
    const Data = new Blog({
        titre : req.body.titre,
        sousTitre : req.body.sousTitre,
        auteur : req.body.auteur,
        description : req.body.description,
        // imageName : req.file.filename,
        datePublication : req.body.datePublication
    })
    // console.log(req.file);

    //Image obligatoire pour l'enregistrement d'un blog
    // if(!req.file){
    //     res.status(400).json("No File Uploaded")
    // }
    // else{

        Data.save()
        .then(() =>{
            console.log("Blog saved");
            res.status(201).json({"result" : "Blog saved"})
            // res.redirect('http://localhost:3000/allblogs/')
        })
        .catch(err =>console.error(err));

    // }
});

//recuperation de les blogs

/**
 * @swagger
 * /allblogs:
 *          get:
 *              description: get all blogs
 *              responses:
 *                  200:
 *                     description: Success
 */
app.get('/allblogs', function(req, res){
    Blog.find()
    .then((data)=>{
        // res.render('AllBlogs',{data:data});
        res.json(data);
    })
});
//page qui affiche le formulaire d'edition
app.get('/blog/:id', function(req, res){
    Blog.findOne({
        _id : req.params.id
    })
    .then((data)=>{
        // res.render('EditBlog',{data:data});
        res.json(data);
    })
    .catch((err)=>{
        res.status(404).json({err:err});
    });
});

//Update
app.put('/editblog/:id', function(req, res){
    const Data = {
        titre : req.body.titre,
        sousTitre : req.body.sousTitre,
        auteur : req.body.auteur,
        description : req.body.description
    }

    Blog.updateOne({
        _id : req.params.id
    }, {$set:Data})
    .then(()=>{
        res.redirect(process.env.FRONTEND_URL + '/allblogs')
    })
    .catch((err)=>{
        console.log(err);
    }); 
});

app.delete('/deleteblog/:id', function(req, res) {
    Blog.findOneAndDelete({_id:req.params.id})
    .then(()=>{
        console.log("Blog deleted");
        res.redirect(process.env.FRONTEND_URL + '/allblogs');
    })
    .catch((err)=>{console.log(err);})
});

//User
const User = require('./models/User');

//Inscription 
app.post('/api/inscription', function(req, res){
    const Data = new User({
        username : req.body.username,
        email : req.body.email,
        password : bcrypt.hashSync(req.body.password, 10),
        admin : req.body.admin
    })

    Data.save()
    .then(()=>{
        console.log("User saved !");
        res.redirect('/signin');
    })
    .catch(err=>{console.log(err);});
})

app.get('/signup', function(req, res){
    res.render('Inscription');
})
app.get('/signin', function(req, res){
    res.render('Connexion');
})

app.post('/api/connexion', function(req, res){
    User.findOne({
        username : req.body.username
    }).then(user =>{
        if(!user)
        {
            return res.status(404).send("No user found");
        }
        if(!bcrypt.compareSync(req.body.password, user.password)){
            return res.status(404).send("Invalid password");
        }
        
        const accessToken = createTokens(user)
        
        res.cookie("access-token", accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30, //30 jours en ms
            httpOnly: true
        } )


        res.redirect(process.env.FRONTEND_URL);
        // res.json('LOGGED IN');

        // res.render('UserPage', {data : user})
    })
    .catch(err =>{console.log(err);});

});

app.get('/logout', (req, res) =>{
    res.clearCookie("access-token");
    res.redirect(process.env.FRONTEND_URL);
})

app.get('/getJwt', validateToken, (req, res) =>{
    res.json(jwtDecode(req.cookies["access-token"]))
});

var server = app.listen(5000, function() {
    console.log("Server listening on port 5000");
});

module.exports = app 