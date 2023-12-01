
const express = require("express");
const session = require("express-session");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const util = require("util");

const app = express();
const port = 3000;

app.use(session({
  secret: "XvYBTRckc5mkdoJ",
  resave: true,
  saveUninitialized: true,
}));


const dbConfig = {
	host: "srv1123.hstgr.io",
	port: "3306",
	user: "u549231978_hetic_g_04",
	password: "Hetic2023$",
	database: "u549231978_hetic_g_04",
};

var [connection, dbQuery] = [];
function dbConnect() {
	// Set up MySQL connection
	connection = mysql.createConnection(dbConfig);

	dbQuery = util.promisify(connection.query).bind(connection);

	connection.connect((err) => {
		if (err) {
			console.error("Error connecting to MySQL:", err);
		} else {
			console.log("Connected to MySQL database");
		}
	});
	
	connection.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') {
			console.log("[MYSQL]: Attemption reconnection");
			dbConnect();
		} else {
			throw err;
		}
	});
}
dbConnect()

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const requireLogin = (req, res, next) => {
	if (req.session.loggedIn) {
		next();
	} else {
		res.redirect("/login");
	}
};


app.get("/", requireLogin, (req, res) => {
	res.render("home");
});

app.get("/login", (req, res, next) => {if (req.session.loggedIn) res.redirect("/"); else next()}, (req, res) => {
	res.render("login");
});

// Handling login form submission
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve the user from the database based on the username
    const getUserQuery = "SELECT * FROM users WHERE email = ?";
    const userResults = await dbQuery(getUserQuery, [email]);

    if (userResults.length === 1) {
      const user = userResults[0];

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        req.session.loggedIn = true;
        res.redirect("/");
        return;
      }
    }

    // Either the user does not exist or the password is incorrect
    res.redirect("/login");
  } catch (error) {
    console.error("Error during login:", error);
    res.redirect("/login");
  }
});

app.get("/register", (req, res, next) => {if (req.session.loggedIn) res.redirect("/"); else next()}, (req, res) => {
	res.render("register");
});

// Handling registration form submission
app.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Basic validation
  if (!username || !email || !password || password !== confirmPassword) {
    res.redirect("/register");
    return;
  }

  try {
    // Hash and salt the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the username or email already exists in the database
    const userExistsQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
    const userExistsResults = await dbQuery(userExistsQuery, [username, email]);

    if (userExistsResults.length > 0) {
      // User with the same username or email already exists
      res.redirect("/register");
      return;
    }

    // Insert the new user into the database with the hashed password
    const insertUserQuery = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    await dbQuery(insertUserQuery, [username, email, hashedPassword]);

    res.redirect("/login");
  } catch (error) {
    console.error("Error registering user:", error);
    res.redirect("/register");
  }
});

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
