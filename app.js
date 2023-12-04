
const express = require("express");
const session = require("express-session");
const fs = require("fs");
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
app.use(cors()); // Enable CORS for all routes
let gCurrentUser = null;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const onlineUsers = new Set();


const dbCredentials = JSON.parse(fs.readFileSync("db.json", "utf-8"));

const dbConfig = dbCredentials.dbConfig

let pool;

function dbConnect() {
	pool = mysql.createPool(dbConfig);

	// Promisify the query method
	pool.query = util.promisify(pool.query);

	pool.getConnection((err, connection) => {
		if (err) {
			console.error("[MYSQL] Error connecting:", err);
		} else {
			console.log("[MYSQL]: Connected to database");
			connection.release();
		}
	});

	pool.on("error", (err) => {
		console.log("db error", err);
		if (err.code === "PROTOCOL_CONNECTION_LOST") {
			console.log("[MYSQL]: Attempting reconnection");
			dbConnect();
		} else {
			throw err;
		}
	});
}

dbConnect();

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


app.get("/", requireLogin, async (req, res) => {
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

				delete user.password;
				req.session.user = user;

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

app.get("/get-contacts", requireLogin, async (req, res) => {
	try {
		let user = req.session.user;
		let dbQuery = `
			SELECT DISTINCT u.id, u.username
			FROM users u
			JOIN messages m ON u.id = m.source OR u.id = m.target
			WHERE (m.source = ? OR m.target = ?) AND u.id != ?
		`;
		let contacts = await pool.query(dbQuery, [user.id, user.id, user.id]);
		contacts.map(contact => contact.isOnline = onlineUsers.has(contact.id));

		res.json({ contacts });
	} catch (error) {
		console.error("Error fetching related users:", error);
	}
});


app.get("/search-users", requireLogin, async (req, res) => {
  try {
    const currentUser = req.session.user; // Assuming you store user information in the session
    const { searchQuery } = req.query;

    // Fetch users that match the search query
    const searchUsersQuery = `
      SELECT id, username
      FROM users
      WHERE username LIKE ? AND id != ?
    `;
    const matchingUsers = await dbQuery(searchUsersQuery, [`%${searchQuery}%`, currentUser.id]);

    res.json({ matchingUsers });
  } catch (error) {
    console.error("Error searching for users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
		users.map(user => user.isOnline = onlineUsers.has(user.id));
	onlineUsers.add(currentUser.id);
	currentUser.isOnline = true;
	broadcastOnlineStatus(currentUser.id, true);
	ws.on("close", (code, message) => {
		onlineUsers.delete(currentUser.id);
		currentUser.isOnline = false;
		broadcastOnlineStatus(currentUser.id, false);
	});
});

function broadcastOnlineStatus(userID, isOnline) {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN && client.userId !== userID) {
			if (isOnline) {
				onlineUsers.forEach(userID => {
					client.send(JSON.stringify({type: "onlineStatus", userID, isOnline: true}));
				});
			} else {
				client.send(JSON.stringify({type: "onlineStatus", userID, isOnline}));
			}
		}
	});
}

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
