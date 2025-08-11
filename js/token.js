/**
 * Token 管理模块
 * 负责 Token 的存储、获取和验证
 */
const TokenManager = {
    /**
     * 保存 Token 到本地存储
     * @param {string} token - 用户 Token
     */
    saveToken(token) {
        localStorage.setItem('yanhekt_token', token);
    },
    
    /**
     * 替换Token（语义化别名，localStorage.setItem会自动覆盖已有值）
     * @param {string} token - 新的用户 Token
     */
    replaceToken(token) {
        this.saveToken(token);
    },
    
    /**
     * 从本地存储获取 Token
     * @returns {string|null} 保存的 Token 或 null
     */
    getToken() {
        return localStorage.getItem('yanhekt_token');
    },
    
    /**
     * 清除保存的 Token
     */
    clearToken() {
        localStorage.removeItem('yanhekt_token');
    },
    
    /**
     * 检查是否已保存 Token
     * @returns {boolean} 是否已保存 Token
     */
    hasToken() {
        return !!this.getToken();
    },
    
    /**
     * 验证 Token 是否有效
     * @returns {Promise<boolean>} Token 是否有效
     */
    async verifyToken() {
        const token = this.getToken();
        if (!token) {
            return false;
        }
        
        try {
            return await API.verifyToken(token);
        } catch (error) {
            console.error('验证 Token 失败:', error);
            return false;
        }
    }
};

