const express = require('express');
const app = express();
const debug = require('debug')('myapp:server');
const path = require('path');
const multer = require('multer');
const logger = require('morgan');
const bodyParser = require('body-parser')

const port = process.env.PORT || 3000


if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// app.use(logger('dev'))
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }));

// static files 
app.use(express.static(path.resolve(__dirname, "public")));

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

//will be using this for uplading
const upload = multer({ storage: storage });

//get the router
// const userRouter = require('./routes/user.route');

app.get('/', function (req, res) {
    // If you needed to modify the status code and content type, you would do so
    // using the Express API, like so. However, this isn't necessary here; Express
    // handles this automatically.
    res.status(200);
    res.type('text/html');

    res.sendFile(path.resolve(__dirname + "/index.html"))
})

app.get('/testUpload', upload.array('file'),function (req,res) {
    return res.send(req.files)
})

app.post('/testUpload', upload.single('file'), function (req, res) {
    console.log('storage location is ', req.hostname + '/' + req.file.path);
    return res.send(req.file.buffer);
})

//if end point is /users/, use the router.
// app.use('/users', userRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

