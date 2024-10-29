const express = require('express');
const cors = require('cors');
require('./db/config');
const User = require('./db/User');
const Product = require('./db/Product');
const jwt = require('jsonwebtoken');
const jwtKey = 'e-comm';

const app = express();

app.use(express.json());
app.use(cors());

app.post('/register', async (req, resp) => {
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;
    jwt.sign({ result }, jwtKey, { expiresIn: '2h' }, (err, token) => {
        if (err) resp.send({ result: 'Something went wrong' })
        resp.send({ result, auth: token });
    });
});

app.post('/login', async (req, resp) => {
    if (req.body.email && req.body.password) {
        const user = await User.findOne(req.body).select('-password');
        if (user) {
            jwt.sign({ user }, jwtKey, { expiresIn: '2h' }, (err, token) => {
                if (err) resp.send({ result: 'Something went wrong' });
                resp.send({ user, auth: token });
            });
        } else resp.send({ result: 'No user found' });
    } else {
        resp.send({ result: 'No user found' });
    }
});

app.post('/add-product', verifyToken, async (req, resp) => {
    let product = new Product(req.body);
    let result = await product.save();
    resp.send(result);
});

app.get('/products', verifyToken, async (req, resp) => {
    let Products = await Product.find();

    if (Products.length > 0) resp.send(Products);
    else resp.send({ result: 'No product found' });
});

app.delete('/product/:id', verifyToken, async (req, resp) => {
    const result = await Product.deleteOne({ _id: req.params.id });
    resp.send(result);
});

app.get('/product/:id', verifyToken, async (req, resp) => {
    const result = await Product.findOne({ _id: req.params.id });
    if (result) resp.send(result);
    else resp.send({ result: 'No record found' });
});

app.put('/product/:id', verifyToken, async (req, resp) => {
    let result = await Product.updateOne({ _id: req.params.id }, { $set: req.body });
    resp.send(result);
});

app.get('/search/:key', verifyToken, async (req, resp) => {
    let result = await Product.find({
        "$or": [
            { name: { $regex: req.params.key } },
            { company: { $regex: req.params.key } },
            { category: { $regex: req.params.key } }
        ]
    });
    resp.send(result);
});

function verifyToken(req, resp, next) {
    let token = req.headers['authorization'];
    if (token) {
        token = token.split(' ')[1];
        jwt.verify(token, jwtKey, (err, valid) => {
            if (err) resp.status(401).send({ result: 'Please provide valid token' });
            else next();
        });
    } else resp.status(403).send({ result: 'Please add token with headers' });
}

app.listen(5000);
