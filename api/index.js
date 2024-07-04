const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt'); //for hash value generation of password
require("./db/config");
const User = require("./db/User");
const Post = require("./db/Post");

const jwt =require("jsonwebtoken"); //for authentication and authorzation
const fs = require('fs');
const cookieParser = require('cookie-parser');
const multer = require('multer'); //for uploading imgages in folder
const uploadMiddleware = multer({dest:'uploads/'}); //middleware

// for password encryption
const salt = bcrypt.genSaltSync(10);
const secret = 'askno39ejlskfh39oqhdkq3o0iwefnaqi';



app.use(express.json());
app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'));


app.get("/",(req,res)=>{
    res.send("done");
})


app.post("/register",async (req,res)=>{
    const {name,email,password} = req.body;
    const result = await User.create({
        name,
        email,
        password:bcrypt.hashSync(password, salt)
    });
    
    res.json(result);
    // res.send("working ok....");
});



app.post("/login",async(req,res)=>{
   const {name,email,password} = req.body;
//    console.log("pass is " + password);
   const user = await User.findOne({email});
   const isPasswordMatch = bcrypt.compareSync(password, user.password);
//    res.send(isPasswordMatch);

    if(isPasswordMatch){
        //loggin
        jwt.sign(
            { name, email, id: user._id}, // Payload
            secret, // Secret key for signing the token
            // { expiresIn: "1h" }, // Options: expiration time
            (err, token) => {
              if (err) throw err;
              res.cookie('token', token).json('ok');
            }
          );

    }else{
        res.status(400).json("Wrong Credentials");
    }


//    res.json(user);
});



app.get('/profile',(req,res)=>{
    // res.json(req.cookies);

    const {token} = req.cookies;
    // console.log("token is" + token);
    jwt.verify(token, secret, {}, (err,info)=>{
        if(err) throw err;
        const { name, email, id } = info;
        res.json({ name, email, id });
    });
});



app.post('/logout', (req,res)=>{
    res.cookie('token', '').json('ok');
});



// for adding new post in db post method

app.post('/post', uploadMiddleware.single('file') ,async (req,res)=>{
    // res.json({files:req.file});
    const {originalname, path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath) ;



    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info)=>{
        if(err) throw err;
        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover:newPath,
            author:info.id,
        })
    
        res.json(postDoc);
    });




});



app.put('/post', uploadMiddleware.single('file') ,(req,res)=>{

    let newPath = null;

    if(req.file){
        const {originalname, path} = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath) ;  
    }


    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info)=>{
        if(err) throw err;
        const {title,summary,content,id} = req.body;        
    
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        // res.json(postDoc);

        if(!isAuthor){
            return res.status(400).json('your are not the author');
        }
        
        await Post.findOneAndUpdate(
            { _id: id },
            {
                title,
                summary,
                content,
                cover:newPath ? newPath : postDoc.cover,
            },
            { new: true }
        );
    
        res.json(postDoc);
    });


});




// for fetching all posts from db get method

app.get('/post', async (req,res)=>{
    res.json(await Post.find().populate('author',['_id', 'name']).sort({createdAt:-1}).limit(20));
})


app.get('/post/:id',async (req,res)=>{
   const {id} = req.params;
   const postdoc = await Post.findById(id).populate('author',['_id', 'name']);
   res.json(postdoc);
});





app.listen(4000);