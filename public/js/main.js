

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




  if (query.length >= 2) {
    const matchingUsers = await searchUsers(query);
    updateUsersUI(matchingUsers);

  } else {
    newUsersContainer.innerHTML = "";
		newUsersContainer.removeAttribute("users-found");
  }
});
