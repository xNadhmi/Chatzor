

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
		let previousDate = null;
		previousMessages.forEach(message => {
			const utcTimestamp = new Date(message.timestamp);
			const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			message.date = new Intl.DateTimeFormat("fr-FR", {year: "numeric", month: "2-digit", day: "2-digit", timeZone: clientTimezone,}).format(utcTimestamp);
			message.time = new Intl.DateTimeFormat("fr-FR", {hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: clientTimezone,}).format(utcTimestamp);

			if (previousDate !== message.date) chat.conversation.messages.elem.innerHTML += `<div class='indicator date'>${message.date}</div>`;

			let div = document.createElement("message");
			div.setAttribute("sent", message.sent);
			div.setAttribute("sender-username", message.sent ? "Me" : message.senderUsername);
			div.setAttribute("timestamp", message.time);
			div.textContent = message.content;
			chat.conversation.messages.elem.appendChild(div);

		});
		
		if (previousMessages.length > 0 ) chat.conversation.messages.elem.innerHTML += `<div class="indicator">Today</div>`;


		chat.conversation.loader.setAttribute("loaded", "");
	}
};

chat.conversation.init = () => {
  // Open a WebSocket connection for the conversation
	chat.conversation.ws = new WebSocket("ws://" + location.host + "/");
	
	chat.conversation.ws.addEventListener("open", () => {
		console.log("WebSocket connection opened");
	
		// Handle incoming messages from the WebSocket server
		chat.conversation.ws.addEventListener("message", (event) => {
			try {
				const parsedMessage = JSON.parse(event.data);
				if (parsedMessage.type === "chat") {
					if (!parsedMessage.sender.avatar) parsedMessage.sender.avatar = "assets/logo/logo.svg";
					if (parsedMessage.sender.id === chat.conversation.ws.target?.id) {
						
						let timestamp = new Date(parsedMessage.timestamp).toISOString().slice(0, 19).replace('T', ' ');
						let div = document.createElement("message");
						div.setAttribute("sender-username", parsedMessage.sender.username);
						div.setAttribute("timestamp", timestamp);
						div.textContent = parsedMessage.content;
						chat.conversation.messages.elem.appendChild(div);
	
						div.scrollIntoView();
					} else {
						let contact = chat.aside.users.contacts.find(contact => (
							contact.id === parsedMessage.sender.id
						));
						if (contact) {
							contact.elem.setAttribute("new-message", true);
						} else {
							
							let div = document.createElement("div");
							div.classList.add("user");
							div.setAttribute("new-message", true);
							div.setAttribute("online", parsedMessage.sender.isOnline);
							div.innerHTML = `
								<div class="avatar"><img src="${parsedMessage.sender.avatar}" alt=""></div>
								<div class="username">${parsedMessage.sender.username}</div>
							`;
					
							div.addEventListener("click", () => {chat.conversation.setTarget(parsedMessage.sender); div.removeAttribute("new-message");});
					
							chat.aside.users.elem.prepend(div);
							chat.aside.users.contacts.push({id: parsedMessage.sender.id, username: parsedMessage.sender.username, elem: div});
						}
					}

					chat.sfx.incoming.load();
					chat.sfx.incoming.play();

				} else if (parsedMessage.type === "onlineStatus") {
					let contact = chat.aside.users.contacts.find(contact => (
						contact.id === parsedMessage.userID
					));
					if (contact) {
						contact.elem.setAttribute("online", parsedMessage.isOnline);
						contact.isOnline = parsedMessage.isOnline;
					}
				}
	
			} catch (error) {
				console.error("[WebSocket] Error processing message:", error);
			}
		});
	});

	chat.conversation.ws.addEventListener("error", (event) => {
		console.error("[WebSocket] Connection error:", event);
	});
};
chat.conversation.init();


chat.conversation.sendMessage = (content) => {
	const message = {
		type: "chat",
		targetID: chat.conversation.ws.target.id,
		content,
	};

	chat.conversation.ws.send(JSON.stringify(message));

	let div = document.createElement("message");
	div.setAttribute("sender-username", "Me");
	div.setAttribute("sent", true);
	div.setAttribute("timestamp", "Now");
	div.textContent = content;
	chat.conversation.messages.elem.appendChild(div);

	div.scrollIntoView();


	let contact = chat.aside.users.contacts.find(contact => (
		contact.id === chat.conversation.ws.target.id
	));

	if (!contact) {
		let div = document.createElement("div");
		div.classList.add("user");
		div.setAttribute("new-message", true);
		div.setAttribute("online", chat.conversation.ws.target.isOnline);
		div.innerHTML = `
			<div class="avatar"><img src="${chat.conversation.ws.target.avatar}" alt=""></div>
			<div class="username">${chat.conversation.ws.target.username}</div>
		`;

		div.addEventListener("click", () => {chat.conversation.setTarget(chat.conversation.ws.target); div.removeAttribute("new-message");});

		chat.aside.users.elem.prepend(div);
		chat.aside.users.contacts.push({id: chat.conversation.ws.target.id, username: chat.conversation.ws.target.username, elem: div});
	}
};

chat.conversation.send.button.addEventListener("click", () => {
	let message = chat.conversation.send.input.value.trim();
	if (Date.now() - (chat.conversation.send.lastTick || 0) >= chat.conversation.send.spamTime && message.length > 0) {
		chat.conversation.sendMessage(message);
		chat.conversation.send.input.value = "";
		chat.conversation.send.lastTick = Date.now();
	}
});

chat.conversation.send.elem.addEventListener("keypress", (event) => {
	if (event.key === "Enter") {
		let message = chat.conversation.send.input.value.trim();
		if (Date.now() - (chat.conversation.send.lastTick || 0) >= chat.conversation.send.spamTime && message.length > 0) {
			chat.conversation.sendMessage(message);
			chat.conversation.send.input.value = "";
			chat.conversation.send.lastTick = Date.now();
		}
	}
});
