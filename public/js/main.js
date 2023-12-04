

const searchUserInput = document.querySelector("aside .search input#search-users");
const newUsersContainer = document.querySelector("aside .search .users");
let chat = {
	aside: {
		elem:									document.querySelector("chat aside"),
		search: {
			elem:								document.querySelector("chat aside > .search"),
			input:							document.querySelector("chat aside > .search input"),
			users: {
				elem:							document.querySelector("chat aside > .search .users"),
			},

			minQueryLength:			2,
		},
		users: {
			elem:								document.querySelector("chat aside > .users"),
			loader:							document.querySelector("chat aside > .users .loader"),
			contacts:						[],
		},
	},

	conversation: {
		elem:									document.querySelector("chat conversation"),
		loader:								document.querySelector("chat conversation > .loader"),
		info: {
			elem:								document.querySelector("chat conversation > .info"),
		},
		messages: {
			elem:								document.querySelector("chat conversation > messages"),
		},

		send: {
			elem:								document.querySelector("chat conversation > chat-send"),
			input:							document.querySelector("chat conversation > chat-send input"),
			button:							document.querySelector("chat conversation > chat-send button"),
			spamTime:						500,
		},
	},

	sfx: {
		incoming:							new Audio("./assets/sfx/incoming.mp3"),
	},
};





// Function to fetch matching users based on search query
chat.aside.search.query = async (query) => {
	try {
		const response = await fetch(`/search-users?query=${query}`);
		const data = await response.json();
		return data.users;
	} catch (error) {
		console.error("Error searching for users:", error);
		return [];
	}
};


// Function to update the UI with matching users
chat.aside.search.users.update = (users) => {
	chat.aside.search.users.elem.innerHTML = "";
	chat.aside.search.users.elem.setAttribute("subtitle", "Found " + users.length + " user(s)");

	users.forEach((user) => {
		if (!user.avatar) user.avatar = "assets/logo/logo.svg";
		
		let div = document.createElement("div");
		div.classList.add("user");
		div.innerHTML = `
			<div class="avatar"><img src="${user.avatar}" alt=""></div>
			<div class="username">${user.username}</div>
		`;

		div.addEventListener("click", () => {
			chat.conversation.setTarget(user);
			div.removeAttribute("new-message");
		});

		chat.aside.search.users.elem.appendChild(div);
	});
};


// Event listener for input changes on the search box
chat.aside.search.input.addEventListener("input", async () => {
	let query = chat.aside.search.input.value.trim();

	if (query.length >= chat.aside.search.minQueryLength) {
		let users = await chat.aside.search.query(query);
		chat.aside.search.users.update(users);

	} else {
		chat.aside.search.users.elem.innerHTML = "";
		chat.aside.search.users.elem.removeAttribute("subtitle");
	}
});



chat.aside.users.getContacts = async (query) => {
	try {
		const response = await fetch(`/get-contacts`);
		const data = await response.json();
		
		return data.contacts;
	} catch (error) {
		console.error("Error searching for users:", error);
		return [];
	}
};

chat.aside.users.updateContacts = async () => {
	chat.aside.users.loader.removeAttribute("loaded");

	chat.aside.users.contacts = [];
	let users = await chat.aside.users.getContacts();

	users.forEach(user => {
		if (!user.avatar) user.avatar = "assets/logo/logo.svg";
		let div = document.createElement("div");
		div.classList.add("user");
		div.setAttribute("online", user.isOnline);

		div.innerHTML = `
			<div class="avatar"><img src="${user.avatar}" alt=""></div>
			<div class="username">${user.username}</div>
		`;

		div.addEventListener("click", () => {chat.conversation.setTarget(user); div.removeAttribute("new-message");});

		chat.aside.users.elem.appendChild(div);
		chat.aside.users.contacts.push({id: user.id, username: user.username, elem: div});
	});


	chat.aside.users.loader.setAttribute("loaded", "");
};
chat.aside.users.updateContacts();




chat.conversation.getHistory = async (targetID) => {
	try {
		const response = await fetch(`/get-history?targetID=${targetID}`);
		const data = await response.json();
		
		return data.messages;
	} catch (error) {
		console.error("Error searching for users:", error);
		return [];
	}
};


chat.conversation.setTarget = async (user) => {
	chat.conversation.loader.removeAttribute("loaded");
	if (user?.id && chat.conversation.ws.readyState === WebSocket.OPEN) {
		let div_user = chat.conversation.info.elem.querySelector(".user");
		let user_img = div_user.querySelector(".avatar img");
		let user_username = div_user.querySelector(".username");
		
		div_user.setAttribute("online", user.isOnline);
		user_img.setAttribute("src", user.avatar);
		user_username.textContent = user.username;

		chat.conversation.ws.target = user;

		chat.conversation.messages.elem.innerHTML = "<div class='indicator'>This is the beginning of your conversation</div>";
		let previousMessages = await chat.conversation.getHistory(user.id);
		previousMessages.forEach(message => {
			let div = document.createElement("message");
			div.setAttribute("sent", message.sent);
			div.setAttribute("sender-username", message.sent ? "Me" : message.senderUsername);
			div.setAttribute("timestamp", message.timestamp);
			div.textContent = message.content;
			chat.conversation.messages.elem.appendChild(div);
		});
		
		if (previousMessages.length > 0 ) chat.conversation.messages.elem.innerHTML += "<div class='indicator'>Newer messages will appear below</div>";


		chat.conversation.loader.setAttribute("loaded", "");
	}
};

});
