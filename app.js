
const express = require("express");
const session = require('express-session');
const mysql = require("mysql");
const app = express();
const port = 3000;

app.use(session({
  secret: "XvYBTRckc5mkdoJ",
  resave: true,
  saveUninitialized: true,
}));

// Set up MySQL connection
const connection = mysql.createConnection({
	host: "your-mysql-host",
	user: "your-mysql-username",
	password: "your-mysql-password",
	database: "your-database-name",
});

// connection.connect((err) => {
// 	if (err) {
// 		console.error("Error connecting to MySQL:", err);
// 	} else {
// 		console.log("Connected to MySQL database");
// 	}
// });

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static("public"));

const requireLogin = (req, res, next) => {
	if (req.session.loggedIn) {
		next();
	} else {
		res.redirect("/login");
	}
};


// Define routes
app.get("/", requireLogin, (req, res) => {
	res.render("home");
});

// Define routes
app.get("/login", (req, res) => {
	res.render("login");
});

// Start the server
app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
