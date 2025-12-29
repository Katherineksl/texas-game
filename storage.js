// storage.js - 本地存储管理
class StorageManager {
	constructor() {
		this.init();
	}

	// 初始化存储
	init() {
		if (!localStorage.getItem("isInitialized")) {
			localStorage.setItem("games", JSON.stringify([]));
			localStorage.setItem("players", JSON.stringify([]));
			localStorage.setItem("isInitialized", "true");
		}
	}

	// 设置存储数据
	setStorageData(key, data) {
		try {
			localStorage.setItem(key, JSON.stringify(data));
			return true;
		} catch (e) {
			console.error("存储数据失败:", e);
			return false;
		}
	}

	// 获取存储数据
	getStorageData(key, defaultValue = null) {
		try {
			const value = localStorage.getItem(key);
			return value !== null ? JSON.parse(value) : defaultValue;
		} catch (e) {
			console.error("读取数据失败:", e);
			return defaultValue;
		}
	}

	// 清除所有数据
	clearAll() {
		localStorage.clear();
		this.init();
	}
}

// 创建全局存储管理器实例
const storage = new StorageManager();

// 导出给其他模块使用
window.storage = storage;
