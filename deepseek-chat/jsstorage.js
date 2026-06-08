// 本地存储管理
class StorageManager {
    constructor() {
        this.storageKey = 'deepseek_chats';
        this.settingsKey = 'deepseek_settings';
    }
    
    // 保存所有对话
    saveChats(chats) {
        localStorage.setItem(this.storageKey, JSON.stringify(chats));
    }
    
    // 获取所有对话
    getChats() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }
    
    // 保存单个对话
    saveChat(chat) {
        const chats = this.getChats();
        const index = chats.findIndex(c => c.id === chat.id);
        if (index >= 0) {
            chats[index] = chat;
        } else {
            chats.push(chat);
        }
        this.saveChats(chats);
        return chat;
    }
    
    // 删除对话
    deleteChat(chatId) {
        const chats = this.getChats().filter(c => c.id !== chatId);
        this.saveChats(chats);
    }
    
    // 获取API设置
    getApiSettings() {
        const data = localStorage.getItem(this.settingsKey);
        return data ? JSON.parse(data) : {
            apiKey: '',
            baseUrl: 'https://api.deepseek.com/v1'
        };
    }
    
    // 保存API设置
    saveApiSettings(settings) {
        localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    }
    
    // 保存主题
    saveTheme(color) {
        localStorage.setItem('deepseek_theme', color);
    }
    
    // 获取主题
    getTheme() {
        return localStorage.getItem('deepseek_theme') || '#4A90E2';
    }
}

const storage = new StorageManager();