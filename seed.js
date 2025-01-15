const Product = require('./models/product');
const mongoose= require('mongoose');
const path= require('path');

const { stringify } = require('querystring');
mongoose.connect('mongodb://127.0.0.1:27017/shop');
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/shop');
    console.log("connection made");
}

/*
const p= new Product({
    name:"grapes",
    price:100,
    category:"fruit"
})
p.save()
.then(p=>{
    console.log(p);
})
.catch(e=>{
    console.log(e);
})
*/

const seedProducts=[{
  author:'6780ae7bd55d1381fb02c02d',
  name:"mango",
  price:60,
  category:"fruit"
},{
  author:'6780ae7bd55d1381fb02c02d',
  name:"milk",
  price:75,
  category:"dairy"
},{
  author:'6780ae7bd55d1381fb02c02d',
  name:"tomato",
  price:20,
  category:"vegetable"
},{
  author:'6780ae7bd55d1381fb02c02d',
  name:"banana",
  price:40,
  category:"fruit"
},{
  author:'6780ae7bd55d1381fb02c02d',
  name:"paneer",
  price:500,
  category:"dairy"
},{
  author:'6780ae7bd55d1381fb02c02d',
  name:"potato",
  price:35,
  category:"vegetable"
}
];

Product.insertMany(seedProducts)
.then(res=>{
  console.log(res);
})
.catch(e=>{
  console.log(e);
})

