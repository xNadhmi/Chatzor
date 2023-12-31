
const express = require("express");
const session = require("express-session");
const fs = require("fs");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const cors = require("cors");
const util = require("util");
const http = require("http");
const WebSocket = require("ws");

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


const dbCredentials = fs.existsSync("db.json") ? JSON.parse(fs.readFileSync("db.json", "utf-8")) : {};
const dbConfig = dbCredentials.dbConfig

let pool;

function dbConnect() {
	pool = mysql.createPool({
		host: process.env.DB_HOST || dbConfig?.host,
		port: process.env.DB_PORT || dbConfig?.port,
		database: process.env.DB_NAME || dbConfig?.database,
		user: process.env.DB_USER || dbConfig?.user,
		password: process.env.DB_PASSWORD || dbConfig?.password
	});

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
	gCurrentUser = req.session.user;
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
		const userResults = await pool.query(getUserQuery, [email]);

		if (userResults.length === 0) {
			res.redirect("/login?error=Email does not belong to any registered user");

		} else if (userResults.length === 1) {
			const user = userResults[0];

			// Compare the provided password with the hashed password in the database
			const passwordMatch = await bcrypt.compare(password, user.password);

			if (passwordMatch) {
				req.session.loggedIn = true;

				req.session.user = user;
				gCurrentUser = req.session.user;

				res.redirect("/");
				return;
			} else {
				res.redirect("/login?error=Invalid password");
			}
		}
	} catch (error) {
		console.error("Error during login:", error);
		res.redirect("/login?error=Internal server error");
	}
});

app.get("/register", (req, res, next) => {if (req.session.loggedIn) res.redirect("/"); else next()}, (req, res) => {
	res.render("register");
});
// Handling registration form submission
app.post("/register", async (req, res) => {
	const { username, email, password, confirmPassword } = req.body;

	if (!username || username.length < 2) {res.redirect("/register?error=Enter a valid username (min. 2 characters)"); return}
	if (!email || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)) {res.redirect("/register?error=Enter a valid email address"); return}
	if (!password || password.length < 3) {res.redirect("/register?error=Password has to be alteast 3 characters long"); return}
	if (password !== confirmPassword) {res.redirect("/register?error=The two passwords do not match"); return}

	try {
		const hashedPassword = await bcrypt.hash(password, 10);

		const userExistsQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
		const userExistsResults = await pool.query(userExistsQuery, [username, email]);

		if (userExistsResults.length > 0) {res.redirect("/register?error=A user with matching username or email already exists"); return}

		// Insert the new user into the database with the hashed password
		const insertUserQuery = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
		await pool.query(insertUserQuery, [username, email, hashedPassword]);

		res.redirect("/login?success=Account successfully created. You may log in");
	} catch (error) {
		console.error("Error registering user:", error);
		res.redirect("/register?error=Internal server error");
	}
});



app.get("/settings", (req, res, next) => {if (!req.session.loggedIn) res.redirect("/login"); else next()}, (req, res) => {
	res.render("settings");
});

// Handling form submission
app.post("/settings/password", async (req, res) => {
	const { oldPassword, newPassword, confirmPassword } = req.body;
	const user = req.session.user;

	try {
		const passwordMatch = await bcrypt.compare(oldPassword, user.password);

		if (!passwordMatch) {
			res.redirect("/settings?error=Invalid old password");
			return;
		}

		if (newPassword.length < 3) {res.redirect("/register?error=Password has to be alteast 3 characters long"); return}

		if (newPassword !== confirmPassword) {
			res.redirect("/settings?error=New password and confirm password do not match");
			return;
		}

		const hashedNewPassword = await bcrypt.hash(newPassword, 10);

		const dbQuery = "UPDATE users SET password = ? WHERE id = ?";
		await pool.query(dbQuery, [hashedNewPassword, user.id]);

		res.redirect("/settings?success=Password updated successfully");
	} catch (error) {
		console.error("Error updating password:", error);
		res.redirect("/settings?error=Internal server error");
	}
});
// Handling form submission
app.post("/settings/avatar", async (req, res) => {
	const { avatar } = req.body;

	if (!(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i).test(avatar)) {
		res.redirect("/settings?error=Please provide a valid image URL");
		return;
	}

	try {
		let user = req.session.user;
		const dbQuery = "UPDATE users SET avatar = ? WHERE id = ?";
		await pool.query(dbQuery, [avatar, user.id]);

		res.redirect("/settings?success=Avatar updated successfully");
	} catch (error) {
		console.error("Error updating avatar:", error);
		res.redirect("/settings?error=Error updating avatar");
	}
});

app.post("/settings/delete", async (req, res) => {
	const { password } = req.body;
	const user = req.session.user;

	try {
		const passwordMatch = await bcrypt.compare(password, user.password);

		if (!passwordMatch) {
			res.redirect("/settings?error=Invalid password for account deletion");
			return;
		}

		await pool.query("START TRANSACTION");

		try {
			// Delete messages sent or received by the user
			const deleteMessagesQuery = "DELETE FROM messages WHERE source = ? OR target = ?";
			await pool.query(deleteMessagesQuery, [user.id, user.id]);

			// Delete the user's account from the database
			const deleteUserQuery = "DELETE FROM users WHERE id = ?";
			await pool.query(deleteUserQuery, [user.id]);

			// Commit the transaction
			await pool.query("COMMIT");
		} catch (error) {
			// Rollback the transaction in case of an error
			await pool.query("ROLLBACK");
			throw error;
		}

		req.session.destroy(() => {
			res.redirect("/login?success=Account permanently deleted successfully");
		});
	} catch (error) {
		console.error("Error deleting account:", error);
		// Redirect to settings page with an error message
		res.redirect("/settings?error=Internal server error");
	}
});


app.get("/get-contacts", requireLogin, async (req, res) => {
	try {
		let user = req.session.user;
		let dbQuery = `
			SELECT DISTINCT u.id, u.username, u.email, u.avatar
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
		let user = req.session.user;
		const { query } = req.query;

		// Fetch users that match the search query
		const dbQuery = `
			SELECT id, username, avatar
			FROM users
			WHERE username LIKE ? AND id != ?
		`;
		let users = await pool.query(dbQuery, [`%${query}%`, user.id]);
		users.map(user => user.isOnline = onlineUsers.has(user.id));

		res.json({ users });
	} catch (error) {
		console.error("Error searching for users:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.get("/get-history", requireLogin, async (req, res) => {
	try {
		let user = req.session.user;
		let {targetID} = req.query;

		let dbQuery = `
			SELECT m.*, u.id AS senderID, u.username AS senderUsername
			FROM messages m JOIN users u ON m.source = u.id
			WHERE (m.source = ? AND m.target = ?) OR (m.source = ? AND m.target = ?)
			ORDER BY m.timestamp ASC;
		`;
		let messages = await pool.query(dbQuery, [user.id, targetID, targetID, user.id]);
		messages.map((message) => {message.sent = message.source == user.id;});

		res.json({ messages });
	} catch (error) {
		console.error("Error searching for messages:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});


// WebSocket connections
wss.on("connection", (ws, req) => {
	const currentUser = req.session?.user || gCurrentUser;
	ws.userID = currentUser.id;

	onlineUsers.add(currentUser.id);
	currentUser.isOnline = true;
	broadcastOnlineStatus(currentUser.id, true);

	ws.on("message", async (message) => {
		try {
			const parsedMessage = JSON.parse(message);

			if (parsedMessage.type === "chat") {
				const targetID = parsedMessage.targetID;
				const content = parsedMessage.content;
				// const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
				const timestamp = Date.now();
				
				const query = "INSERT INTO messages (source, target, content, timestamp) VALUES (?, ?, ?, FROM_UNIXTIME(?))";
				await pool.query(query, [currentUser.id, targetID, content, timestamp / 1000]);

				// Broadcast the message to the target user
				wss.clients.forEach((client) => {
					if (client !== ws && client.userID === targetID) {
						client.send(JSON.stringify({
							type: "chat",
							content,
							sender: currentUser,
							targetID: targetID,
							timestamp
						}));
					}
				});
			}
		} catch (error) {
			console.error("[WebSocket] Error processing message:", error);
		}
	});

	ws.on("close", (code, message) => {
		onlineUsers.delete(currentUser.id);
		currentUser.isOnline = false;
		broadcastOnlineStatus(currentUser.id, false);
	});
});

// Function to broadcast online status to other clients
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




server.listen(port, (err) => {
	if (err) throw err;
	console.log(`Server is running at http://localhost:${port}`);
});
