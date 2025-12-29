// index.js - 游戏大厅页面逻辑
let userInfo = null;

// 页面加载完成
document.addEventListener("DOMContentLoaded", function () {
	// 获取用户信息
	getUserInfo();
	// 加载活跃游戏
	loadActiveGames();
});

// 获取用户信息（模拟）
function getUserInfo() {
	// 尝试从localStorage获取用户信息
	userInfo = storage.getStorageData("userInfo");
	if (!userInfo) {
		// 如果没有用户信息，创建一个默认用户
		userInfo = {
			nickName: "管理员",
			avatarUrl: "",
		};
		storage.setStorageData("userInfo", userInfo);
	}

	// 显示用户信息
	document.getElementById("userName").textContent = userInfo.nickName;
	document.getElementById("userCard").style.display = "block";
}

// 加载活跃游戏
function loadActiveGames() {
	document.getElementById("loading").style.display = "block";
	document.getElementById("noGames").style.display = "none";
	document.getElementById("gamesList").innerHTML = "";

	try {
		const allGames = storage.getStorageData("games", []);
		const activeGames = allGames
			.filter((game) => game.status === "active")
			.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

		document.getElementById("loading").style.display = "none";

		if (activeGames.length === 0) {
			document.getElementById("noGames").style.display = "block";
			return;
		}

		// 渲染游戏列表
		activeGames.forEach((game) => {
			const gameElement = createGameElement(game);
			document.getElementById("gamesList").appendChild(gameElement);
		});
	} catch (err) {
		console.error("加载游戏失败:", err);
		document.getElementById("loading").style.display = "none";
		document.getElementById("noGames").style.display = "block";
	}
}

// 创建游戏元素
function createGameElement(game) {
	const gameDiv = document.createElement("div");
	gameDiv.className = "list-item";
	gameDiv.onclick = () => goToGame(game._id);

	gameDiv.innerHTML = `
        <div>
            <div class="card-title">${game.name}</div>
            <div class="card-content">玩家: ${game.playerCount}/${
		game.maxPlayers
	}</div>
            <div class="card-content">创建时间: ${new Date(
							game.createTime
						).toLocaleString()}</div>
        </div>
        <div class="status-active">进行中</div>
    `;

	return gameDiv;
}

// 创建新游戏
function createGame() {
	// 设置标志，表示要创建新游戏
	sessionStorage.setItem("createNewGame", "true");

	// 跳转到游戏管理页面
	window.location.href = "game.html";
}

// 跳转到游戏详情
function goToGame(gameId) {
	// 使用sessionStorage传递gameId
	sessionStorage.setItem("targetGameId", gameId);

	// 跳转到游戏管理页面
	window.location.href = "game.html";
}

// 下拉刷新（模拟）
function refreshGames() {
	loadActiveGames();
}

// 页面显示时重新加载（如果从其他页面返回）
window.addEventListener("pageshow", function (event) {
	if (event.persisted) {
		loadActiveGames();
	}
});
