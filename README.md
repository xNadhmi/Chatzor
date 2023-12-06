# Chatzor

<p align="center">
<img src="public/assets/logo/logo.svg" alt="Chatzor Logo" width="200" height="200">
</p>

Chatzor is a simple web chat application built with Node.js, Express, and WebSocket for real-time communication. Users can register, log in, and exchange messages with other users in real-time.

## Getting Started

To run Chatzor locally, follow these steps:

### 1. Clone the repository:

```bash
git clone https://github.com/xNadhmi/Chatzor/
```

### 2. Install dependencies:

Chatzor relies on the following npm packages: `bcrypt` `mysql` `cors` `ejs` `express` `express-session` `ws` and `sass`

Install them using:

```bash
npm install
```

or

```bash
npm install bcrypt mysql cors ejs express express-session ws sass
```


### 3. Set up the database:

- Create a MySQL database.
- Create a `db.json` file in the project root with your MySQL database credentials, in this structure:

```json
{
	"dbConfig": {
		"host": "your-host",
		"port": "your-port",
		"database": "your-database",
		"user": "your-username",
		"password": "your-password"
	}
}
```


### 4. Compile Sass

You will need to recompile Sass files, use:

```bash
sass --watch sass:public/css
```


### 5. Run the application:

To start the application, use:

```bash
npm start
```

or

```bash
node app.js
```

The application will be accessible at `http://localhost:3000`.

## Usage

1. Visit the registration page to create a new account.
2. Log in with your credentials.
3. Change account settings (optional)
4. Start chatting with other users in real-time.

## Features

- Real-time private messaging
- User authentication with bcrypt
- Messaging history
- Notification sound effect
- Online status tracking

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.