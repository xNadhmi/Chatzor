

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
const searchUsers = async (query) => {
  try {
    const response = await fetch(`/search-users?searchQuery=${query}`);
    const data = await response.json();
    return data.matchingUsers;
  } catch (error) {
    console.error('Error searching for users:', error);
    return [];
  }
};

// Function to update the UI with matching users
const updateUsersUI = (users) => {
  newUsersContainer.innerHTML = "";
	newUsersContainer.setAttribute("users-found", "Found " + users.length + " user(s)");

  users.forEach((user) => {
		if (!user.avatar) user.avatar = "assets/logo/logo.svg";

    const userDiv = document.createElement("div");
    userDiv.classList.add("user");
		userDiv.innerHTML = `
			<div class="avatar"><img src="${user.avatar}" alt=""></div>
			<div class="username">${user.username}</div>
		`;

    // Add click event to initiate a conversation, customize as needed
    userDiv.addEventListener('click', () => {
      // Implement logic to initiate a conversation with the selected user
      console.log(`Initiate conversation with ${user.username}`);
    });

    newUsersContainer.appendChild(userDiv);
  });
};

// Event listener for input changes on the search box
searchUserInput.addEventListener("input", async () => {
  const query = searchUserInput.value.trim();

  if (query.length >= 2) {
    const matchingUsers = await searchUsers(query);
    updateUsersUI(matchingUsers);

  } else {
    newUsersContainer.innerHTML = "";
		newUsersContainer.removeAttribute("users-found");
  }
});
