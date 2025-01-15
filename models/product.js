const mongoose= require ('mongoose');
const Review= require('./review');
const Schema=mongoose.Schema;
const productSchema= new Schema({
    name:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true,
        min:0
    },
    images:[{
        url:String,
        filename:String
    }
    ],
    category:{
        type:String,
        lowercase : true,
        enum:['fruit','vegetable','dairy']
    },
    author:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:'Review'
        }
    ]
});

productSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})

const Product=mongoose.model('Product',productSchema);
module.exports=Product;