// game.js - 游戏管理页面逻辑
let gameId = null;
let game = null;
let players = [];
let bountyRecords = [];
let bountyPool = 0;

// 默认玩家列表
const defaultPlayers = [
	{ name: "豆豆", selected: true },
	{ name: "秋妍", selected: true },
	{ name: "宏伟", selected: true },
	{ name: "秋佳", selected: true },
	{ name: "凯瑟琳", selected: true },
	{ name: "肥龙", selected: true },
];

let customPlayers = [];

// 页面加载完成
document.addEventListener("DOMContentLoaded", function () {
	// 检查是否需要显示创建游戏表单
	const isCreatingNewGame = sessionStorage.getItem("createNewGame");
	const targetGameId = sessionStorage.getItem("targetGameId");

	if (isCreatingNewGame) {
		sessionStorage.removeItem("createNewGame");
		showCreateForm();
	} else if (targetGameId) {
		sessionStorage.removeItem("targetGameId");
		gameId = targetGameId;
		loadGameData();
	} else {
		showCreateForm();
	}
});

// 显示创建游戏表单
function showCreateForm() {
	document.getElementById("createForm").style.display = "block";
	document.getElementById("playerSelection").style.display = "none";
	document.getElementById("gameManagement").style.display = "none";
}

// 显示玩家选择界面
function showPlayerSelection() {
	document.getElementById("createForm").style.display = "none";
	document.getElementById("playerSelection").style.display = "block";
	document.getElementById("gameManagement").style.display = "none";

	renderDefaultPlayers();
	renderCustomPlayers();
}

// 显示游戏管理界面
function showGameManagement() {
	document.getElementById("createForm").style.display = "none";
	document.getElementById("playerSelection").style.display = "none";
	document.getElementById("gameManagement").style.display = "block";

	loadPlayers();
	updateGameInfo();
}

// 渲染默认玩家选择
function renderDefaultPlayers() {
	const grid = document.getElementById("defaultPlayersGrid");
	grid.innerHTML = "";

	defaultPlayers.forEach((player, index) => {
		const playerDiv = document.createElement("div");
		playerDiv.className = `player-option ${player.selected ? "selected" : ""}`;
		playerDiv.onclick = () => togglePlayerSelection(index);

		playerDiv.innerHTML = `
			<div class="player-option-text">${player.name}</div>
			${player.selected ? '<div class="player-option-check">✓</div>' : ""}
		`;

		grid.appendChild(playerDiv);
	});
}

// 切换默认玩家选择状态
function togglePlayerSelection(index) {
	defaultPlayers[index].selected = !defaultPlayers[index].selected;
	renderDefaultPlayers();
}

// 渲染自定义玩家
function renderCustomPlayers() {
	const section = document.getElementById("customPlayersSection");
	const grid = document.getElementById("customPlayersGrid");

	if (customPlayers.length === 0) {
		section.style.display = "none";
		return;
	}

	section.style.display = "block";
	grid.innerHTML = "";

	customPlayers.forEach((player, index) => {
		const playerDiv = document.createElement("div");
		playerDiv.className = `player-option ${player.selected ? "selected" : ""}`;
		playerDiv.onclick = () => toggleCustomPlayerSelection(index);

		playerDiv.innerHTML = `
			<div class="player-option-text">${player.name}</div>
			${player.selected ? '<div class="player-option-check">✓</div>' : ""}
		`;

		grid.appendChild(playerDiv);
	});
}

// 切换自定义玩家选择状态
function toggleCustomPlayerSelection(index) {
	customPlayers[index].selected = !customPlayers[index].selected;
	renderCustomPlayers();
}

// 添加自定义玩家
function addCustomPlayer() {
	const input = document.getElementById("customPlayerName");
	const playerName = input.value.trim();

	if (!playerName) {
		showToast("请输入玩家昵称", "error");
		return;
	}

	// 检查是否已存在相同名称的玩家
	const allPlayers = [...defaultPlayers, ...customPlayers];
	const nameExists = allPlayers.some((player) => player.name === playerName);

	if (nameExists) {
		showToast("玩家昵称已存在", "error");
		return;
	}

	// 添加到自定义玩家列表
	customPlayers.push({
		name: playerName,
		selected: true, // 自动选择新添加的玩家
	});

	// 清空输入框
	input.value = "";
	renderCustomPlayers();
	showToast("玩家添加成功", "success");
}

// 跳过玩家选择
function skipPlayerSelection() {
	showGameManagement();
}

// 确认选择玩家并添加到游戏
function confirmPlayerSelection() {
	// 获取选中的默认玩家
	const selectedDefaultPlayers = defaultPlayers
		.filter((player) => player.selected)
		.map((player) => player.name);

	// 获取选中的自定义玩家
	const selectedCustomPlayers = customPlayers
		.filter((player) => player.selected)
		.map((player) => player.name);

	// 合并所有选中的玩家
	const allSelectedPlayers = [
		...selectedDefaultPlayers,
		...selectedCustomPlayers,
	];

	if (allSelectedPlayers.length === 0) {
		showToast("请至少选择一个玩家", "error");
		return;
	}

	// 添加所有选中的玩家
	allSelectedPlayers.forEach((playerName) => {
		doAddPlayer(playerName);
	});

	showToast(`已添加${allSelectedPlayers.length}个玩家`, "success");
	showGameManagement();
}

// 创建游戏
function createGame() {
	// 自动生成游戏名称
	const allGames = storage.getStorageData("games", []);
	const gameNumber = allGames.length + 1;
	const gameName = `游戏${gameNumber}`;

	const config = {
		name: gameName,
		maxPlayers: parseInt(document.getElementById("maxPlayers").value) || 5,
		entryFee: parseInt(document.getElementById("entryFee").value) || 200,
		initialScore:
			parseInt(document.getElementById("initialScore").value) || 2000,
		bountyPerKill:
			parseInt(document.getElementById("bountyPerKill").value) || 100,
		maxBounty: parseInt(document.getElementById("maxBounty").value) || 600,
		rewardRatios: document.getElementById("rewardRatios").value || "4:3:2:1",
		penaltyRatios: document.getElementById("penaltyRatios").value || "2:3:5",
	};

	const gameData = {
		_id: Date.now().toString(),
		...config,
		status: "active",
		createTime: new Date().toISOString(),
		playerCount: 0,
	};

	try {
		const allGames = storage.getStorageData("games", []);
		allGames.push(gameData);
		storage.setStorageData("games", allGames);

		gameId = gameData._id;
		game = gameData;

		showToast("游戏创建成功", "success");
		showPlayerSelection();
	} catch (err) {
		console.error("创建游戏失败:", err);
		showToast("创建失败", "error");
	}
}

// 加载游戏数据
function loadGameData() {
	try {
		const allGames = storage.getStorageData("games", []);
		const foundGame = allGames.find((g) => g._id === gameId);

		if (foundGame) {
			game = foundGame;
			// 从游戏数据恢复赏金记录
			bountyRecords = game.bountyRecords || [];
			bountyPool = game.bountyPool || 0;
			showGameManagement();
		} else {
			console.error("游戏不存在");
			showCreateForm();
		}
	} catch (err) {
		console.error("加载游戏失败:", err);
		showCreateForm();
	}
}

// 加载玩家数据
function loadPlayers() {
	document.getElementById("loadingPlayers").style.display = "block";
	document.getElementById("playersList").innerHTML = "";

	try {
		const allPlayers = storage.getStorageData("players", []);
		players = allPlayers.filter((player) => player.gameId === gameId);

		document.getElementById("loadingPlayers").style.display = "none";
		renderPlayers();
		updateGameInfo();
	} catch (err) {
		console.error("加载玩家失败:", err);
		document.getElementById("loadingPlayers").style.display = "none";
	}
}

// 渲染玩家列表
function renderPlayers() {
	const playersList = document.getElementById("playersList");
	playersList.innerHTML = "";

	players.forEach((player) => {
		const playerDiv = document.createElement("div");
		playerDiv.className = "player-item";

		playerDiv.innerHTML = `
			<div class="player-info">
				<div class="player-details">
					<div class="player-name">${player.name}</div>
					<div class="player-score">积分: ${player.currentScore}</div>
				</div>
			</div>
		`;

		playersList.appendChild(playerDiv);
	});
}

// 更新游戏信息显示
function updateGameInfo() {
	if (!game) return;

	document.getElementById("gameTitle").textContent = game.name;
	document.getElementById("gameInfo").innerHTML = `
		状态: ${game.status === "active" ? "进行中" : "已结束"} |
		玩家: ${players.length}/${game.maxPlayers} |
		赏金池: ${bountyPool}元
	`;

	// 更新按钮状态
	const addPlayerBtn = document.getElementById("addPlayerBtn");
	const settleBtn = document.getElementById("settleBtn");

	addPlayerBtn.style.display =
		players.length < game.maxPlayers ? "inline-block" : "none";
	settleBtn.style.display = players.length >= 3 ? "inline-block" : "none";
}

// 添加玩家（手动）
function addPlayer() {
	const playerName = prompt("请输入玩家昵称:");
	if (playerName && playerName.trim()) {
		doAddPlayer(playerName.trim());
	}
}

// 执行添加玩家
function doAddPlayer(playerName) {
	const playerData = {
		_id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
		gameId: gameId,
		name: playerName,
		currentScore: game.initialScore,
		entryFeePaid: game.entryFee,
		additionalEntries: 0,
		bountyEarned: 0,
		createTime: new Date().toISOString(),
	};

	try {
		const allPlayers = storage.getStorageData("players", []);
		allPlayers.push(playerData);
		storage.setStorageData("players", allPlayers);

		showToast("玩家添加成功", "success");
		loadPlayers();
	} catch (err) {
		console.error("添加玩家失败:", err);
		showToast("添加失败", "error");
	}
}

// 记录赏金
function recordBounty() {
	if (players.length === 0) {
		showToast("请先添加玩家", "error");
		return;
	}

	// 更新选择器选项
	updatePlayerSelectors();
	document.getElementById("bountyForm").style.display = "block";
}

// 更新玩家选择器
function updatePlayerSelectors() {
	const killerSelect = document.getElementById("killerSelect");
	const killedSelect = document.getElementById("killedSelect");

	killerSelect.innerHTML = "";
	killedSelect.innerHTML = "";

	players.forEach((player) => {
		const option1 = document.createElement("option");
		option1.value = players.indexOf(player);
		option1.textContent = player.name;
		killerSelect.appendChild(option1);

		const option2 = document.createElement("option");
		option2.value = players.indexOf(player);
		option2.textContent = player.name;
		killedSelect.appendChild(option2);
	});
}

// 隐藏赏金表单
function hideBountyForm() {
	document.getElementById("bountyForm").style.display = "none";
}

// 确认记录赏金
function confirmBounty() {
	const killerIndex = parseInt(document.getElementById("killerSelect").value);
	const killedIndex = parseInt(document.getElementById("killedSelect").value);

	if (killerIndex === killedIndex) {
		showToast("不能自己猎杀自己", "error");
		return;
	}

	const killerPlayer = players[killerIndex];
	const killedPlayer = players[killedIndex];

	if (!killerPlayer || !killedPlayer) {
		showToast("请选择有效的玩家", "error");
		return;
	}

	const bountyAmount = Math.min(
		game.bountyPerKill,
		game.maxBounty - bountyPool
	);

	if (bountyAmount > 0) {
		const bountyRecord = {
			id: Date.now().toString(),
			killerPlayer: killerPlayer.name,
			killedPlayer: killedPlayer.name,
			amount: bountyAmount,
			timestamp: new Date().toLocaleString(),
		};

		bountyRecords.push(bountyRecord);
		bountyPool += bountyAmount;

		// 保存赏金记录到游戏数据
		saveGameState();

		// 更新赏金记录显示
		renderBountyRecords();

		document.getElementById("bountyForm").style.display = "none";
		showToast(`赏金 +${bountyAmount}`, "success");
	} else {
		showToast("赏金已达上限", "error");
	}
}

// 渲染赏金记录
function renderBountyRecords() {
	const bountySection = document.getElementById("bountySection");
	const bountyList = document.getElementById("bountyList");

	if (bountyRecords.length === 0) {
		bountySection.style.display = "none";
		return;
	}

	bountySection.style.display = "block";
	bountyList.innerHTML = "";

	bountyRecords.forEach((record) => {
		const recordDiv = document.createElement("div");
		recordDiv.className = "bounty-item";

		recordDiv.innerHTML = `
			<div class="bounty-info">
				<div class="bounty-player">${record.killerPlayer} 猎杀 ${record.killedPlayer}</div>
				<div class="bounty-amount">+${record.amount}元</div>
			</div>
			<div class="bounty-content">
				<div class="bounty-time">${record.timestamp}</div>
				<button class="btn-danger" onclick="deleteBountyRecord('${record.id}')">删除</button>
			</div>
		`;

		bountyList.appendChild(recordDiv);
	});

	updateGameInfo();
}

// 删除赏金记录
function deleteBountyRecord(recordId) {
	showModal("确认删除", "确定要删除这条赏金记录吗？", () => {
		const recordIndex = bountyRecords.findIndex(
			(record) => record.id === recordId
		);
		if (recordIndex !== -1) {
			const record = bountyRecords[recordIndex];
			bountyPool = Math.max(0, bountyPool - record.amount);
			bountyRecords.splice(recordIndex, 1);

			// 保存游戏状态
			saveGameState();

			renderBountyRecords();
			showToast("删除成功", "success");
		}
		closeModal();
	});
}

// 结算游戏
function settleGame() {
	// 存储结算数据到sessionStorage
	const settlementData = {
		gameId: gameId,
		bountyRecords: bountyRecords,
		bountyPool: bountyPool,
	};

	sessionStorage.setItem("currentSettlement", JSON.stringify(settlementData));

	// 跳转到结算页面
	window.location.href = "settlement.html";
}

// 显示模态框
function showModal(title, body, confirmCallback) {
	document.getElementById("modalTitle").textContent = title;
	document.getElementById("modalBody").innerHTML = body;
	document.getElementById("modalConfirmBtn").onclick = confirmCallback;
	document.getElementById("modal").classList.add("show");
}

// 关闭模态框
function closeModal() {
	document.getElementById("modal").classList.remove("show");
}

// 保存游戏状态到本地存储
function saveGameState() {
	try {
		const allGames = storage.getStorageData("games", []);
		const gameIndex = allGames.findIndex((g) => g._id === gameId);

		if (gameIndex !== -1) {
			// 更新游戏的赏金记录和赏金池
			allGames[gameIndex].bountyRecords = bountyRecords;
			allGames[gameIndex].bountyPool = bountyPool;
			storage.setStorageData("games", allGames);
		}
	} catch (err) {
		console.error("保存游戏状态失败:", err);
	}
}

// 确认模态框操作
function confirmModalAction() {
	// 这个函数会被动态设置
}

// 显示提示消息
function showToast(message, type = "info") {
	// 简单的toast实现
	const toast = document.createElement("div");
	toast.textContent = message;
	toast.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: ${
			type === "success" ? "#07c160" : type === "error" ? "#ff4757" : "#666"
		};
		color: white;
		padding: 12px 24px;
		border-radius: 8px;
		z-index: 1000;
		font-weight: bold;
	`;

	document.body.appendChild(toast);

	setTimeout(() => {
		document.body.removeChild(toast);
	}, 3000);
}
