const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mariadb = require('mariadb');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, '../public')));

// MariaDB connection setup
const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'root',
    database: 'voyageonsensemble',
    password: 'Yas2024data@',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MariaDB!');
        connection.release();
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
})();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'Yas2024data@',
    resave: false,
    saveUninitialized: true,
}));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login.html');
}

// Serve the welcomepage.html at the root URL (/)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../welcomepage.html')); // Ensure correct path to the HTML file
});

// Homepage route without fetching articles
app.get('/Homepage.ejs', async (req, res) => {
    // Retrieve the user's name from the session, or default to 'Guest'
    const userName = req.session.userName || 'Guest'; // Use req.session.userName

    // Render the homepage without articles
    res.render('homepage', { articles: [], name: userName }); // Pass an empty articles array
});


const axios = require('axios');

// User registration route with email verification
app.post('/SignIn.html', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const lowercasedEmail = email.trim().toLowerCase(); // Normalize email input

    try {
        // Verify email using Abstract API
        const apiKey = '527b0da29ba94db5b76d05fbb1c001a8'; 
        const response = await axios.get(`https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${lowercasedEmail}`);

        const { is_valid_format, is_mx_found, is_smtp_valid } = response.data;

        if (!is_valid_format.value || !is_mx_found.value || !is_smtp_valid.value) {
            return res.status(400).json({ error: 'Invalid or non-existent email address' });
        }

        // Check if the email is already registered
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [lowercasedEmail]);

        if (existingUser) {
            console.log('Email already registered.');
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, lowercasedEmail, hashedPassword]
        );

        console.log('User registered successfully.');
        req.session.userId = result.insertId.toString();
        req.session.userName = name;

        res.redirect('/Homepage.ejs');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});


// User login route
app.post('/login.html', async (req, res) => {
    const { email, password } = req.body;
    const lowercasedEmail = email.trim().toLowerCase();

    try {
        const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [lowercasedEmail]);

        if (!user) {
            console.log('User not found.');
            return res.status(404).json({ error: 'User not found' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.userId = user.id;      // Store user ID in session
            req.session.userName = user.name;  // Store user name in session
            console.log(`User logged in: ${user.name}`);
            res.redirect('/Homepage.ejs');  // Redirect to homepage or welcome page
        } else {
            console.log('Invalid credentials.');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login failed:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// User logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.redirect('/welcomepage.html');
    });
});

// Route for rendering destination page without fetching articles
app.get('/destination/:name', async (req, res) => {
    const destinationName = req.params.name; // Extract destination from URL
    const userName = req.session.userName || 'Guest'; // Get name from session or default to 'Guest'

    // Render the destination page without articles
    res.render('destination', { articles: [], destinationName, name: userName }); // Pass an empty articles array
});


// Static HTML routes
const staticPages = [
    'Aboutus', 'contactus', 'publish', 'destinations', 
    'africa', 'america', 'asia', 'europe', 'oceania',
    'Algiersarticle', 'Australiaarticle', 'Baliarticle', 
    'Californiaarticle', 'Dubaiarticle', 'Egyptarticle', 
    'Hikingarticle', 'Japanarticle', 'Maldivesarticle', 
    'Moroccoarticle', 'Milanoarticle', 'Newyorkarticle', 
    'Niagarafallsarticle', 'Parisarticle', 'Safariarticle', 
    'Switzerlandarticle', 'Aboutus.Signin', 'contactUs.Signin', 
    'Homepage.Signin', 'Publish.Signin', 'welcomepage'
];

staticPages.forEach(page => {
    app.get(`/${page}.html`, (req, res) => {
        res.sendFile(path.join(__dirname, `../${page}.html`));
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Route for About Us page
app.get('/Aboutus.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Aboutus.html')); // Ensure correct path
});

// Route for Contact Us page
app.get('/contactus.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../contactus.html')); // Ensure correct path
});

// Route for Publish page
app.get('/publish.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../publish.html')); // Ensure correct path
});

// Route for Destinations page
app.get('/destinations.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../destinations.html')); // Ensure correct path
});

// Routes for other static HTML pages...
app.get('/africa.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../africa.html')); // Ensure correct path
});
app.get('/america.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../america.html')); // Ensure correct path
});
app.get('/asia.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../asia.html')); // Ensure correct path
});
app.get('/europe.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../europe.html')); // Ensure correct path
});
app.get('/oceania.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../oceania.html')); // Ensure correct path
});
app.get('/Algiersarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Algiersarticle.html')); // Ensure correct path
});
app.get('/Australiaarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Australiaarticle.html')); // Ensure correct path
});
app.get('/Baliarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Baliarticle.html')); // Ensure correct path
});
app.get('/Californiaarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Californiaarticle.html')); // Ensure correct path
});
app.get('/Dubaiarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Dubaiarticle.html')); // Ensure correct path
});
app.get('/Egyptarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Egyptarticle.html')); // Ensure correct path
});
app.get('/Hikingarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Hikingarticle.html')); // Ensure correct path
});
app.get('/Japanarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Japanarticle.html')); // Ensure correct path
});
app.get('/Maldivesarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Maldivesarticle.html')); // Ensure correct path
});
app.get('/Moroccoarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Moroccoarticle.html')); // Ensure correct path
});
app.get('/Milanoarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Milanoarticle.html')); // Ensure correct path
});
app.get('/Newyorkarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Newyorkarticle.html')); // Ensure correct path
});
app.get('/Niagarafallsarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Niagarafallsarticle.html')); // Ensure correct path
});
app.get('/Parisarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Parisarticle.html')); // Ensure correct path
});
app.get('/Safariarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Safariarticle.html')); // Ensure correct path
});
app.get('/Switzerlandarticle.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Switzerlandarticle.html')); // Ensure correct path
});
app.get('/Aboutus.Signin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Aboutus.Signin.html')); // Ensure correct path
});
app.get('/contactUs.Signin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../contactUs.Signin.html')); // Ensure correct path
});
app.get('/Homepage.Signin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Homepage.Signin.html')); // Ensure correct path
});
app.get('/Publish.Signin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../Publish.Signin.html')); // Ensure correct path
});
app.get('/welcomepage.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../welcomepage.html')); // Ensure correct path
});

// Route for Login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../login.html')); // Ensure correct path to your login HTML file
});

// Route for Sign In page
app.get('/SignIn.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../SignIn.html')); // Ensure correct path to your SignIn HTML file
});

