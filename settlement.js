// settlement.js - 游戏结算页面逻辑
let gameId = null;
let game = null;
let players = [];
let bountyRecords = [];
let showPreparation = true;

let finalMealCost = 0;
let finalMealShareRatio = 10;
let otherBonus = 0;
let totalScore = 0;

let settlement = {
	prizePool: 0,
	bountyPool: 0,
	mealCost: 0,
	mealShareAmount: 0,
	rankings: [],
	finalResults: [],
};

// 页面加载完成
document.addEventListener("DOMContentLoaded", function () {
	// 从sessionStorage获取结算数据
	const settlementDataStr = sessionStorage.getItem("currentSettlement");
	if (!settlementDataStr) {
		showToast("没有找到结算数据", "error");
		setTimeout(() => {
			window.location.href = "index.html";
		}, 2000);
		return;
	}

	const settlementData = JSON.parse(settlementDataStr);
	gameId = settlementData.gameId;
	bountyRecords = settlementData.bountyRecords || [];
	settlement.bountyPool = settlementData.bountyPool || 0;

	loadSettlementData();
});

// 加载结算数据
function loadSettlementData() {
	document.getElementById("loadingSection").style.display = "block";

	// 加载游戏和玩家数据
	Promise.all([loadGameData(), loadPlayersData()])
		.then(() => {
			loadSettlementInputs();
			renderFinalScores();
			document.getElementById("loadingSection").style.display = "none";
		})
		.catch((err) => {
			console.error("加载结算数据失败:", err);
			document.getElementById("loadingSection").style.display = "none";
			showToast("加载数据失败", "error");
		});
}

// 加载游戏数据
function loadGameData() {
	return new Promise((resolve, reject) => {
		try {
			const allGames = storage.getStorageData("games", []);
			const foundGame = allGames.find((g) => g._id === gameId);
			if (foundGame) {
				game = foundGame;
				resolve();
			} else {
				reject(new Error("游戏不存在"));
			}
		} catch (err) {
			reject(err);
		}
	});
}

// 加载玩家数据
function loadPlayersData() {
	return new Promise((resolve, reject) => {
		try {
			const allPlayers = storage.getStorageData("players", []);
			players = allPlayers.filter((player) => player.gameId === gameId);
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}

// 加载结算输入数据
function loadSettlementInputs() {
	try {
		let settlementInputs = storage.getStorageData(`settlementInputs_${gameId}`);

		if (
			typeof settlementInputs !== "object" ||
			settlementInputs === null ||
			Array.isArray(settlementInputs)
		) {
			settlementInputs = {};
		}

		finalMealCost = settlementInputs.finalMealCost || 0;
		finalMealShareRatio = settlementInputs.finalMealShareRatio || 10;
		otherBonus = settlementInputs.otherBonus || 0;

		document.getElementById("finalMealCost").value = finalMealCost;
		document.getElementById("finalMealShareRatio").value = finalMealShareRatio;
		document.getElementById("otherBonus").value = otherBonus;
	} catch (err) {
		console.error("加载结算输入数据失败:", err);
	}
}

// 渲染最终积分确认
function renderFinalScores() {
	const finalScoresDiv = document.getElementById("finalScores");
	finalScoresDiv.innerHTML = "";

	players.forEach((player) => {
		const scoreItem = document.createElement("div");
		scoreItem.className = "score-item";

		scoreItem.innerHTML = `
			<div class="player-info">
				<div class="player-name">${player.name}</div>
			</div>
			<div class="score-info">
				<div class="score-edit-container">
					<span class="current-score">当前积分:</span>
					<input
						class="score-edit-input"
						type="number"
						placeholder="积分"
						data-playerid="${player._id}"
						value="${player.currentScore}"
						onchange="updatePlayerScore('${player._id}', this.value)"
					/>
				</div>
			</div>
		`;

		finalScoresDiv.appendChild(scoreItem);
	});
}

// 积分输入处理
function updatePlayerScore(playerId, newScore) {
	const score = parseInt(newScore) || 0;

	if (isNaN(score)) {
		showToast("请输入有效数字", "error");
		return;
	}

	try {
		const allPlayers = storage.getStorageData("players", []);
		const playerIndex = allPlayers.findIndex((p) => p._id === playerId);

		if (playerIndex !== -1) {
			allPlayers[playerIndex].currentScore = score;
			storage.setStorageData("players", allPlayers);

			// 更新本地players数组
			const localPlayerIndex = players.findIndex((p) => p._id === playerId);
			if (localPlayerIndex !== -1) {
				players[localPlayerIndex].currentScore = score;
			}

			showToast("积分已更新", "success");
		}
	} catch (err) {
		console.error("更新积分失败:", err);
		showToast("更新失败", "error");
	}
}

// 开始结算
function startSettlement() {
	// 验证输入
	if (finalMealCost < 0) {
		showToast("请输入有效的吃饭费用", "error");
		return;
	}

	if (finalMealShareRatio < 0 || finalMealShareRatio > 100) {
		showToast("饭费公共费用应在0-100之间", "error");
		return;
	}

	// 更新参数
	finalMealCost =
		parseFloat(document.getElementById("finalMealCost").value) || 0;
	finalMealShareRatio =
		parseFloat(document.getElementById("finalMealShareRatio").value) || 10;
	otherBonus = parseFloat(document.getElementById("otherBonus").value) || 0;

	// 保存设置
	saveSettlementInputs();

	showPreparation = false;
	calculateSettlement();
	renderSettlement();
}

// 保存结算输入
function saveSettlementInputs() {
	try {
		const settlementInputs = {
			finalMealCost: finalMealCost,
			finalMealShareRatio: finalMealShareRatio,
			otherBonus: otherBonus,
		};
		storage.setStorageData(`settlementInputs_${gameId}`, settlementInputs);
	} catch (err) {
		console.error("保存结算输入失败:", err);
	}
}

// 计算结算结果
function calculateSettlement() {
	try {
		// 1. 处理赏金逻辑
		const killedCount = {};
		const killerCount = {};
		bountyRecords.forEach((record) => {
			if (!killedCount[record.killedPlayer]) {
				killedCount[record.killedPlayer] = 0;
			}
			killedCount[record.killedPlayer]++;

			if (!killerCount[record.killerPlayer]) {
				killerCount[record.killerPlayer] = 0;
			}
			killerCount[record.killerPlayer]++;
		});

		// 为每个玩家分配赏金
		const playersWithBounties = players.map((player) => {
			const killedTimes = killedCount[player.name] || 0;
			const killerTimes = killerCount[player.name] || 0;
			const bountyEarned = killerTimes * 100;

			return {
				...player,
				bountyEarned,
				killedTimes,
				killerTimes,
				totalEntryFee: game.entryFee,
			};
		});

		// 2. 计算奖金池
		const totalEntryFees = playersWithBounties.reduce((sum, player) => {
			return sum + player.totalEntryFee;
		}, 0);

		// 3. 计算赏金池总金额和剩余
		const totalBountyPool = bountyRecords.length * 200;
		const bountyPaidToKillers = bountyRecords.length * 100;
		const remainingBountyPool = totalBountyPool - bountyPaidToKillers;

		// 4. 可用奖金池
		const availablePrizePool =
			totalEntryFees + remainingBountyPool + otherBonus;

		// 5. 计算买单金额
		const mealShareAmount = Math.round(
			availablePrizePool * (finalMealShareRatio / 100)
		);

		// 6. 计算吃饭剩余费用
		const remainingMealCost = Math.max(0, finalMealCost - mealShareAmount);

		// 7. 剩余奖金池
		const remainingPrizePool = availablePrizePool - mealShareAmount;

		// 8. 计算积分总数
		totalScore = playersWithBounties.reduce((sum, player) => {
			return sum + player.currentScore;
		}, 0);

		// 9. 按积分排名玩家
		const sortedPlayers = [...playersWithBounties].sort(
			(a, b) => b.currentScore - a.currentScore
		);

		// 10. 计算奖励和惩罚
		const rewardRatios = parseRatios(game.rewardRatios);
		const penaltyRatios = parseRatios(game.penaltyRatios);

		const rewardCount = rewardRatios.length;
		const penaltyCount = penaltyRatios.length;

		const rewardDistribution = calculateDistribution(
			remainingPrizePool,
			rewardRatios
		);
		const penaltyDistribution = calculateDistribution(
			remainingMealCost,
			penaltyRatios
		);

		// 11. 生成最终结算结果
		const finalResults = sortedPlayers.map((player, index) => {
			let prizeAmount = 0;
			let penaltyAmount = 0;

			// 前N名奖励
			if (index < rewardCount && rewardDistribution[index] !== undefined) {
				prizeAmount = rewardDistribution[index];
			}
			// 后N名惩罚
			else if (index >= sortedPlayers.length - penaltyCount) {
				const penaltyIndex = index - (sortedPlayers.length - penaltyCount);
				if (penaltyDistribution[penaltyIndex] !== undefined) {
					penaltyAmount = penaltyDistribution[penaltyIndex];
				}
			}

			// 计算各项费用
			const entryFee = game.entryFee;
			const bountyPaid = player.killedTimes * game.entryFee;
			const totalPaid = entryFee + penaltyAmount + bountyPaid;
			const totalReceived = prizeAmount + player.bountyEarned;
			const netResult = totalReceived - totalPaid;
			const settlementAmount =
				prizeAmount + player.bountyEarned - penaltyAmount;

			return {
				...player,
				rank: index + 1,
				prizeAmount,
				penaltyAmount,
				bountyEarned: player.bountyEarned,
				killedTimes: player.killedTimes || 0,
				entryFee,
				bountyPaid,
				totalPaid,
				totalReceived,
				netResult,
				settlementAmount,
			};
		});

		settlement = {
			prizePool: totalEntryFees,
			bountyPool: totalBountyPool,
			remainingBountyPool: remainingBountyPool,
			availablePrizePool: availablePrizePool,
			mealCost: finalMealCost,
			mealShareAmount: mealShareAmount,
			remainingPrizePool: remainingPrizePool,
			rankings: sortedPlayers,
			finalResults,
		};
	} catch (err) {
		console.error("计算结算结果失败:", err);
		showToast("计算失败", "error");
	}
}

// 计算分配
function calculateDistribution(prizePool, ratios) {
	const validRatios = ratios.filter((ratio) => !isNaN(ratio) && ratio > 0);
	if (validRatios.length === 0) {
		return [];
	}
	const totalRatio = validRatios.reduce((sum, ratio) => sum + ratio, 0);
	return validRatios.map((ratio) => {
		return Math.round((prizePool * ratio) / totalRatio);
	});
}

// 解析比例字符串
function parseRatios(ratioString) {
	return ratioString
		.split(":")
		.map((r) => {
			const num = parseInt(r.trim());
			return isNaN(num) ? 0 : num;
		})
		.filter((num) => num > 0);
}

// 渲染结算界面
function renderSettlement() {
	document.getElementById("preparationSection").style.display = "none";
	document.getElementById("summarySection").style.display = "block";
	document.getElementById("resultsSection").style.display = "block";
	document.getElementById("actionsSection").style.display = "block";

	renderSettlementSummary();
	renderBountyRecords();
	renderResults();
}

// 渲染结算摘要
function renderSettlementSummary() {
	const summaryDiv = document.getElementById("settlementSummary");
	summaryDiv.innerHTML = `
		<div class="summary-item">
			<span class="summary-label">积分总数:</span>
			<span class="summary-value">${totalScore}分</span>
		</div>
		<div class="summary-item highlight">
			<span class="summary-label">可用奖金池:</span>
			<span class="summary-value">${settlement.availablePrizePool}元</span>
			<div class="calculation-formula">(总入场费 + 赏金池剩余 + 其他奖金)</div>
		</div>
		<div class="summary-item">
			<span class="summary-label">总入场费:</span>
			<span class="summary-value">${settlement.prizePool}元</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">赏金池剩余:</span>
			<span class="summary-value">${settlement.remainingBountyPool}元</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">其他奖金:</span>
			<span class="summary-value">${otherBonus}元</span>
		</div>
		<div class="summary-item meal-cost-red">
			<span class="summary-label">吃饭费用:</span>
			<span class="summary-value">${settlement.mealCost}元</span>
		</div>
	`;
}

// 渲染赏金记录
function renderBountyRecords() {
	const recordsSection = document.getElementById("bountyRecordsSection");
	const recordsList = document.getElementById("bountyRecordsList");

	if (!bountyRecords || bountyRecords.length === 0) {
		recordsSection.style.display = "none";
		return;
	}

	recordsSection.style.display = "block";
	recordsList.innerHTML = "";

	bountyRecords.forEach((record) => {
		const recordDiv = document.createElement("div");
		recordDiv.className = "bounty-item";

		recordDiv.innerHTML = `
			<div class="bounty-player">${record.killerPlayer || "未知"} 猎杀 ${
			record.killedPlayer
		}</div>
			<div class="bounty-amount">赏金100元</div>
		`;

		recordsList.appendChild(recordDiv);
	});
}

// 渲染结算结果
function renderResults() {
	const resultsList = document.getElementById("resultsList");
	resultsList.innerHTML = "";

	settlement.finalResults.forEach((result) => {
		const resultDiv = document.createElement("div");
		resultDiv.className = "result-item";

		resultDiv.innerHTML = `
			<div class="result-header">
				<div class="rank-badge rank-${result.rank}">${result.rank}</div>
				<div class="player-name">${result.name}</div>
				<div class="player-score">(${result.currentScore}分)</div>
			</div>

			<div class="result-details">
				<div class="detail-row">
					<span class="detail-label">进场费:</span>
					<span class="detail-value score-negative">-${result.entryFee}元</span>
				</div>
				${
					result.killedTimes > 0
						? `
					<div class="detail-row">
						<span class="detail-label score-negative">被赏金:</span>
						<span class="detail-value score-negative">-${result.bountyPaid}元</span>
					</div>
				`
						: ""
				}
				${
					result.penaltyAmount > 0
						? `
					<div class="detail-row">
						<span class="detail-label score-negative">饭费:</span>
						<span class="detail-value score-negative">-${result.penaltyAmount}元</span>
					</div>
				`
						: ""
				}
				${
					result.prizeAmount > 0
						? `
					<div class="detail-row">
						<span class="detail-label score-positive">奖金:</span>
						<span class="detail-value score-positive">+${result.prizeAmount}元</span>
					</div>
				`
						: ""
				}
				${
					result.bountyEarned > 0
						? `
					<div class="detail-row">
						<span class="detail-label score-positive">赏金:</span>
						<span class="detail-value score-positive">+${result.bountyEarned}元</span>
					</div>
				`
						: ""
				}
				<div class="detail-row">
					<span class="detail-label">净收益:</span>
					<span class="detail-value ${
						result.netResult >= 0 ? "score-positive" : "score-negative"
					}">
						${result.netResult >= 0 ? "+" : ""}${result.netResult}元
					</span>
				</div>
				<div class="detail-row result-total">
					<span class="detail-label">结算金额:</span>
					<span class="detail-value ${
						result.settlementAmount >= 0 ? "score-positive" : "score-negative"
					}">
						${result.settlementAmount >= 0 ? "+" : ""}${result.settlementAmount}元
					</span>
				</div>
			</div>
		`;

		resultsList.appendChild(resultDiv);
	});
}

// 完成结算
function finishSettlement() {
	if (confirm("确定要完成游戏结算吗？此操作不可撤销。")) {
		doFinishSettlement();
	}
}

// 执行完成结算
function doFinishSettlement() {
	try {
		// 更新游戏状态
		const allGames = storage.getStorageData("games", []);
		const gameIndex = allGames.findIndex((g) => g._id === gameId);

		if (gameIndex !== -1) {
			allGames[gameIndex].status = "finished";
			allGames[gameIndex].settlementData = settlement;
			allGames[gameIndex].finishTime = new Date().toISOString();

			storage.setStorageData("games", allGames);

			showToast("结算完成", "success");
			// 返回首页
			setTimeout(() => {
				window.location.href = "index.html";
			}, 1500);
		} else {
			throw new Error("游戏不存在");
		}
	} catch (err) {
		console.error("完成结算失败:", err);
		showToast("结算失败", "error");
	}
}

// 显示提示消息
function showToast(message, type = "info") {
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
