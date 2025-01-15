if(process.env.NODE_ENV !=="production"){
    require('dotenv').config();
}

const express= require('express');
const app=express();
const path= require('path');
const catchasync=require('./utilities/catchasync')
const ejsmate=require('ejs-mate');
const methodoverride=require('method-override');
const epresserror=require('./utilities/epresserror');
const joi=require('joi');
const Product =require('./models/product');
const Review= require('./models/review');
const session=require('express-session');
const flash=require('connect-flash');
const passport=require('passport');
const localstrategy=require('passport-local');
const User=require('./models/user');
const { isLoggedIn }=require('./middleware');
const { storeReturnTo } = require('./middleware');
const multer  = require('multer');
const {storage}=require('./cloudinary/app');
const upload = multer({storage});
const dburl=process.env.DB_URL || 'mongodb://127.0.0.1:27017/shop';
const mongoose= require('mongoose');
const { stringify } = require('querystring');
const MongoDBStore=require('connect-mongo')(session)
//const { default: MongoStore } = require('connect-mongo');
//const { MongoStore } = require('connect-mongo');
//const mongoUrl = 'mongodb://localhost:27017/mydatabase';
//const MongoDBStore = MongoStore.create({
//mongoUrl,
//collectionName: 'products',
//});




//************
// || 
//**************


//mongoose.connect(dburl, {
//    useNewUrlParser: true,
 //   useCreateIndex: true,
 //   useUnifiedTopology: true,
 //   useFindAndModify: false
//});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


mongoose.connect(dburl);
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(dburl);
   console.log("connection made");
}

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dburl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionconf = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}


app.use(session(sessionconf));
//app.use(helmet());

//'mongodb://127.0.0.1:27017/shop'

const categories=['fruit','vegetable','dairy'];
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.engine('ejs',ejsmate);
app.use(express.urlencoded({extended:true}));
app.use(methodoverride('_method'))
app.use(express.static(path.join(__dirname,'public')))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//6780ae7bd55d1381fb02c02d   <div class="text-center mt-5">

app.use((req,res,next)=>{
    res.locals.currentuser=req.user;
    res.locals.success=req.flash('success');
    res.locals.error=req.flash('error');
    next();
})



const validate= (req,res,next)=>{
    const pSchema = joi.object({
        name: joi.string().required(),
        price: joi.number().required().min(0),
        category:joi.optional()
    })  
    const {error} =pSchema.validate(req.body);
    if(error){
        const mess=error.details.map(e=> e.message).join(',')
        throw new epresserror(mess,400);
    }else{
        next();
    }
}

const validateReview= (req,res,next)=>{
    const reviewSchema = joi.object({
        review: joi.object({
          body: joi.string().required(),
          rating: joi.number().required().min(1).max(5)
        }).required()
    });
    
    const {error} =reviewSchema.validate(req.body);
    console.log(error);
    if(error){
        const mess=error.details.map(e=> e.message).join(',')
        throw new epresserror(mess,400);
    }else{
       next();
    }
}


const isAuthor=async (req,res,next)=>{
    const {id}= req.params;
    const product=await Product.findById(id);
    if(!product.author.equals(req.user._id)){
        req.flash('error','You are not allowed to do this task');
        return res.redirect('/products')
    }
    next();
}


const isreviewAuthor=async (req,res,next)=>{
    const {id,reviewId}= req.params;
    const review=await Review.findById(reviewId);
    if(!review.author.equals(req.user._id)){
        req.flash('error','You are not allowed to do this task');
        return res.redirect('/products')
    }
    next();
}

app.get('/register',catchasync(async (req,res)=>{
    res.render('users/register');
}))

app.post('/register',catchasync(async (req,res)=>{
    try{
        const {username,password,email}=req.body;
        const user= new User({username,email})
        const registereduser= await User.register(user,password);
        req.login(registereduser,err=>{
            if(err) return next(err);
            req.flash('success','welcome to ABC MARKETIING STORE');
            res.redirect('/products/home');
        })
    }catch(e){
        req.flash('error',e.message);
        res.redirect('/register');
    }
}));


app.get('/login',catchasync(async (req,res)=>{
    res.render('users/login');
}))


app.post('/login',storeReturnTo,passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}),catchasync(async (req,res)=>{
    req.flash('success','Welcome back');
    const redirectedUrl=res.locals.returnTo || '/products';
    res.redirect(redirectedUrl);
}));



app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/products');
    });
}); 

app.get('/products',catchasync(async (req,res,next)=>{
    const products= await Product.find({});
    res.render('products/index',{ products });
}))

app.get('/products/home',(req,res)=>{
    res.render('products/home')
})

app.get('/products/new', isLoggedIn,catchasync(async(req,res,next)=>{
    res.render('products/new',{categories})
}))

app.post('/products',isLoggedIn, upload.array('image'),validate,catchasync(async (req,res,next)=>{
    const newp= new Product(req.body);
    newp.images=req.files.map(f=>({url:f.path,filename:f.filename}));
    newp.author=req.user._id;
    await newp.save();
    req.flash('success','Successfully made a new Product')
    res.redirect(`/products/${newp._id}`)
}));

app.get('/products/:id',catchasync(async (req,res,next)=>{
    const {id}= req.params;
    const product= await Product.findById(id).populate({
        path:'reviews',
        populate:{
            path:'author'
        }
    }).populate('author');
    if(!product){
        req.flash('error','Cannot find that product');
        return res.redirect('/products');
    }
    res.render('products/show',{ product })
}))

app.get('/products/:id/edit',isLoggedIn,isAuthor,catchasync(async (req,res,next)=>{
    const {id}= req.params;
    const product= await Product.findById(id)
    if(!product){
        req.flash('error','Cannot find that product');
        return res.redirect('/products');
    }
    res.render('products/edit',{ product ,categories})     
}))

app.put('/products/:id',isLoggedIn,isAuthor,validate,upload.array('image'),catchasync(async(req,res,next)=>{
    const edittedp= await Product.findByIdAndUpdate(id,req.body,{runValidators:true, new :true});
    const imgs=req.files.map(f=>({url:f.path,filename:f.filename}));
    ediitedp.images.push(...imgs);
    await edittedp.save();
    req.flash('success','Successfully updated product');
    res.redirect(`/products/${edittedp._id}`)
}))

app.delete('/products/:id',isAuthor,catchasync(async(req,res,next)=>{
    const {id}= req.params;
    const deletedp= await Product.findByIdAndDelete(id);
    res.redirect('/products');
}))

app.post('/products/:id/reviews',isLoggedIn,validateReview,catchasync(async (req,res)=>{
    console.log(req.body.review);
    const {id}= req.params;
    const product =await Product.findById(id);
    //const review= new Review(req.body.review);
    const review = new Review({ body: req.body.review.body, rating: req.body.review.rating });
    review.author=req.user._id;
    product.reviews.push(review);
    await review.save();
    await product.save();
    req.flash('success','Successfully Created new review!');
    res.redirect(`/products/${product._id}`);
    
}))


app.delete('/products/:id/reviews/:reviewId',isLoggedIn,isreviewAuthor, catchasync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Product.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash('success','Successfully deleted review!');
    res.redirect(`/products/${id}`);
}))



app.all('*',(req,res,next)=>{
    next(new epresserror('Page Not Found',404));
})

app.use((err,req,res,next)=>{
   const{code=500, message="something went wrong"}=err
    res.status(code).render('error',{err});
})

const port = process.env.PORT || 3000;
app.listen(port, () =>{
    console.log('serving on port');
})

