// 主题管理
function changeTheme(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    storage.saveTheme(color);
}

// 初始化主题
function initTheme() {
    const savedTheme = storage.getTheme();
    changeTheme(savedTheme);
}
