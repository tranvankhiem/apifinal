// GET JSON file in args 
const yargs = require('yargs');
yargs.options({
    port: {
        alias: 'p',
        description: 'Set port',
        default: 3000
    },
    file: {
        alias: 'f',
        description: 'Set JSON File',
        default: './json-samples/default.json'
    },
    authentication: {
        alias: 'a',
        description: 'Enable authenticaded routes',
        default: 'true'
    },
    delay: {
        alias: 'd',
        description: 'Miliseconds delay before response',
        default: '1500'
    }
});

console.log(yargs.argv);

const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const express = require('express');
const fetch = require('node-fetch');


const port = process.env.PORT || 3000;

// bodyParser, load json-server instance to use in this module
server.use(jsonServer.bodyParser)
    // Use json-server middlewares 
    // server.use(middlewares);






server.set('views', './views');
server.set('view engine', 'ejs');
server.use(express.static('views'));

// configure user storage in memory
const userStorage = require('./security/users-storage')({
    email: 'user@example.com',
    password: '1234'
});
userStorage.logUsers();

// Route for login
const login = require('./routes/login-route')(userStorage);
server.post('/login', login);

// Route for sign-in
const register = require('./routes/sign-in-route')(userStorage);
server.post('/sign-in', register);



// Auth middleware 
if (yargs.argv.authentication === 'true') {
    const authMiddleware = require('./middleware/auth-middleware');
    // server.use(authMiddleware);
}

// delay middleware
const delayMiddleware = require('./middleware/delay-middleware')(yargs.argv.delay);
server.use(delayMiddleware);

// Token verify route
const verify = require('./routes/verify-route');
const { response } = require('express');
server.get('/verify', verify);



server.get('/allblogs', async(req, res) => {
    var datas = await getAllData('blogs');
    res.render('blogs', { datas: datas })
}); // show all blogs

server.get('/delsp/:id', async(req, res) => {

    var id = req.params.id;
    var baseUrl = url + 'blogs/' + id;
    const option = {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
    }
    fetch(baseUrl, option)
        .then(response => response.text())
        .then(res.redirect('/allblogs'));
}); // delete a blog


server.get('/addblog', (req, res) => {
    res.render('blogadd');
}); // render add blog


server.post('/addblog', async(req, res) => {
    if (req.body.submit) {
        var data = {
            title: req.body.title,
            content: req.body.content,
            description: req.body.mota,
            image: req.body.image,
            date: new Date()
        }
        console.log(data);
        await postData('blogs', data);
        res.redirect('/allblogs')
    }
}); // add new blog

server.get('/edit/:id', (req, res) => {
    var id = req.params.id;
    getAllData('blogs/' + id).then(value => {
        res.render('blogedit', { dataedit: value });
    })
}); // edit blog


server.post('/edit', async(req, res) => {
    if (req.body.submit) {
        var id = req.body.id;
        var data = {
            title: req.body.title,
            content: req.body.content,
            description: req.body.mota,
            image: req.body.image,
            date: new Date()
        }
        await editData('blogs/' + id, data);
        res.redirect('/allblogs')
    }
});

server.get('/thongke', async(req, res) => {
    var products = await getAllData('products');
    var blogs = await getAllData('blogs');
    var cart = await getAllData('cart');
    var cart_list = cart.map(element => {
        return element.cart_list[0];
    });
    var dataCart = cart_list.map(element => {
        return { "name": element.name, "price": element.price }
    });

    res.render('thongke', { dataCart: JSON.stringify(dataCart), blogs: blogs, cart: cart, products: products });
}); // edit blog


server.get('/sanpham', async(req, res) => {

    getAllData('products').then(value => {
        var danhmuc = value.map(v => v.category);
        getCateFromId(danhmuc).then(v => {
            return { danhmuc: v, products: value }
        }).then(value => {
            res.render('sanpham', { datas: value })
        })
    })

}); // show all sanpham 

function getCateFromId(id) {
    return getAllData('cate').then(value => {
        return value.filter(v => id.toString().includes(v.id.toString()))
    })
}



server.get('/addsanpham', async(req, res) => {
    var danhmuc = await getAllData('cate');
    res.render('sanphamadd', {
        danhmuc: danhmuc
    });
}); // render add blog

server.post('/addsanpham', async(req, res) => {
    if (req.body.submit) {
        var images = req.body.images.split(",");
        var data = {
            image: images,
            name: req.body.title,
            price: req.body.price,
            category: req.body.danhmuc,
        }
        await postData('products', data);
        res.redirect('/sanpham')
    }
}); // add new blog

server.get('/delsanpham/:id', async(req, res) => {

    var id = req.params.id;
    var baseUrl = url + 'products/' + id;
    const option = {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
    }
    fetch(baseUrl, option)
        .then(response => response.text())
        .then(res.redirect('/sanpham')); //xoá đây
}); // delete a blog

server.get('/editsanpham/:id', (req, res) => {
    var id = req.params.id;
    getAllData('products/' + id).then(value => {
        getAllData('cate').then(v => {
            res.render('sanphamedit', { dataedit: value, cate: v });
        })
    })
}); // edit blog
server.post('/editsanpham', async(req, res) => {
    if (req.body.submit) {
        var id = req.body.id;
        var images = req.body.images.split(",");
        var data = {
            image: images,
            name: req.body.title,
            price: req.body.price,
            category: req.body.danhmuc,
        }
        await editData('products/' + id, data);
        res.redirect('/sanpham')
    }
});

// Start JSON Server
server.use(router);
server.listen(port);



// this is all function support for add, edit, delete blogs

const url = 'http://localhost:3000/';
const fetchAPi = async(url, option) => {
    const dulieu = await fetch(url, option);
    return dulieu.json();
}; // function fetch


const getAllData = async(subUrl) => { // đây là hàm show
    var baseUrl = url + subUrl;
    const options = {
        method: "GET",
        headers: {
            'Content-Type': 'application/json'
        },
    }
    return await fetchAPi(baseUrl, options);
}; // function get all data

const postData = async(subUrl, body) => {//đây là hàm thêm
    var baseUrl = url + subUrl;
    const options = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
    return await fetchAPi(baseUrl, options);
}; // function post data

const editData = async(subUrl, body) => { //đây là hàm sửa
    var baseUrl = url + subUrl;
    const options = {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
    return await fetchAPi(baseUrl, options);
}; // function post data

