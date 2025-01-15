//cloudinary@1.41.3
//multer-storage-cloudinary@4.0.0
//multer@1.4.5-lts.1

const cloudinary=require('cloudinary').v2;
const {CloudinaryStorage}=require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
});

const storage= new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'ABCSHOP',
        allowedFormats:['jpg','png','jpeg']
    }
});

module.exports={
    cloudinary,
    storage
}
