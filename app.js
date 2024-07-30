const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename
    }
});
const upload = multer({ storage: storage });

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Create MySQL connection
const connection = mysql.createConnection({
    host: ' mysql-martinong.alwaysdata.net',
    user: 'martinong',
    password: 'Potestquivolt!',
    database: 'martinong_cars'
});
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));

// Temporary storage for logged-in user
let loggedInUser = null;

// product route
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM car_rental';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving cars');
        }
        res.render('index', { car_rental: results, user: loggedInUser });
    });
});

app.get('/product/:id', (req, res) => {
    const carID = req.params.id;
    const sql = 'SELECT * FROM car_rental WHERE carID = ?';
    connection.query(sql, [carID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving car');
        }
        if (results.length > 0) {
            res.render('product', { product: results[0], user: loggedInUser });
        } else {
            res.status(404).send('Car not found');
        }
    });
});

app.get('/rental/:id', (req, res) => {
    const carID = req.params.id;
    const sql = 'SELECT * FROM car_rental WHERE carID = ?';
    connection.query(sql, [carID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving car');
        }
        if (results.length > 0) {
            res.render('rental', { car: results[0], user: loggedInUser });
        } else {
            res.status(404).send('Car not found');
        }
    });
});

// add car route
app.get('/addCar', (req, res) => {
    res.render('addCar', { user: loggedInUser });
});

app.post('/addCar', upload.single('image'), (req, res) => {
    const { name, price, quantity } = req.body;
    const image = req.file.filename;
    const sql = 'INSERT INTO car_rental (CarName, Price, image, availability) VALUES (?, ?, ?, ?)';

    connection.query(sql, [name, price, image, quantity], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error adding car');
        } else {
            res.redirect('/');
        }
    });
});

// signup route
app.get('/signup', (req, res) => {
    res.render('signup', { user: loggedInUser });
});

app.post('/signup', (req, res) => {
    const { Username, Password, PhoneNumber } = req.body;
    const sql = 'INSERT INTO login (UserName, Password, PhoneNumber) VALUES (?, ?, ?)';
    connection.query(sql, [Username, Password, PhoneNumber], (error, results) => {
        if (error) {
            console.error('Error signing up:', error);
            return res.status(500).send('Error signing up');
        } else {
            console.log('Signup successful');
            res.redirect('/login');
        }
    });
});

// login route
app.get('/login', (req, res) => {
    res.render('login', { user: loggedInUser });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM login WHERE UserName = ? AND Password = ?';
    connection.query(sql, [username, password], (error, results) => {
        if (error) {
            console.error('Error logging in:', error);
            return res.status(500).send('Error logging in');
        }
        if (results.length > 0) {
            // user exists in the database, login successful
            console.log('Login successful');
            loggedInUser = results[0]; // Store user data in global variable
            res.redirect('/');
        } else {
            // No user found with the provided credentials
            console.log('Invalid username or password');
            res.render('login', { error: 'Invalid username or password', user: loggedInUser });
        }
    });
});

// profile route
app.get('/profile', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    res.render('profile', { user: loggedInUser });
});

// edit profile route
loggedInUser = null;
app.get('/editProfile', (req, res) => {
    if (!loggedInUser) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    res.render('editProfile', { user: loggedInUser });
});

app.post('/editProfile', (req, res) => {
    const { Username, PhoneNumber, Password } = req.body;
    const sql = 'UPDATE login SET UserName = ?, PhoneNumber = ?, Password = ? WHERE UserId = ?';
    connection.query(sql, [Username, PhoneNumber, Password, loggedInUser.id], (error, results) => {
        if (error) {
            console.error('Error updating profile:', error);
            return res.status(500).send('Error updating profile');
        }
        // Update loggedInUser with new data
        loggedInUser.UserName = Username;
        loggedInUser.PhoneNumber = PhoneNumber;
        loggedInUser.Password = Password;
        res.redirect('/profile');
    });
});

// delete account route
app.post('/deleteAccount', (req, res) => {
    const sql = 'DELETE FROM login WHERE UserID = ?';
    connection.query(sql, [loggedInUser.UserID], (error, results) => {
        if (error) {
            console.error('Error deleting account:', error);
            return res.status(500).send('Error deleting account');
        }
        loggedInUser = null;
        res.redirect('/');
    });
});

// logout route
app.get('/logout', (req, res) => {
    loggedInUser = null;
    res.redirect('/');
});

// Show payment form
app.get('/payment', (req, res) => {
    res.render('payment', { user: loggedInUser });
});

// Process payment form submission
app.post('/processPayment', (req, res) => {
    const { cardNumber, cardName, expiryDate, cvv } = req.body;

    res.redirect('/paymentSuccess');
});

// Show payment success page
app.get('/paymentSuccess', (req, res) => {
    res.render('paymentSuccess', { user: loggedInUser });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
