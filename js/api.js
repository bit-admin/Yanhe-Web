/**
 * API 请求模块
 * 负责与后端 API 通信
 */
const API = {
    // 动态获取配置
    get BASE_URL() {
        return APIConfig.getCurrentConfig().API_BASE_URL;
    },
    
    // SSO 登录服务URL
    get SSO_AUTH_URL() {
        return APIConfig.getCurrentConfig().SSO_AUTH_URL;
    },
    
    /**
     * 使用学号和密码登录获取Token
     * @param {string} username - 学号
     * @param {string} password - 密码
     * @returns {Promise<string>} 返回获取到的Token
     */
    async loginWithCredentials(username, password) {
        try {
            const authUrl = this.SSO_AUTH_URL;
            
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username.trim(),
                    password: password 
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Login failed, please check your student ID and password.');
            }
            
            if (!data.token) {
                throw new Error('Login successful but no token received');
            }
            
            return data.token;
        } catch (error) {
            console.error('SSO login failed:', error);
            
            // 如果是网络错误，提供更友好的错误信息
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network connection failed, server may be temporarily unreachable. Please check your network connection or try again later.');
            }
            
            // 如果是HTTP错误
            if (error.message.includes('HTTP Error')) {
                throw new Error(`Server response error: ${error.message}`);
            }
            
            throw error;
        }
    },
    
    /**
     * 验证 Token 是否有效
     * @param {string} token - 用户 Token
     * @returns {Promise<boolean>} Token 是否有效
     */
    async verifyToken(token) {
        try {
            const response = await fetch(`${this.BASE_URL}/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            return data.success && data.valid;
        } catch (error) {
            console.error('验证 Token 失败:', error);
            return false;
        }
    },
    
    /**
     * 获取全校直播列表
     * @param {number} page - 页码，默认为1
     * @param {number} pageSize - 每页大小，默认为16
     * @returns {Promise<Object>} 直播列表数据
     */
    async getPublicLiveList(page = 1, pageSize = 16) {
        const token = TokenManager.getToken();
        if (!token) {
            throw new Error('请先设置 Token');
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/live/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, page, page_size: pageSize })
            });
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to retrieve live stream list');
            }
            
            return data.data;
        } catch (error) {
            console.error('Failed to retrieve public live stream list:', error);
            throw error;
        }
    },
    
    /**
     * 获取个人直播列表
     * @param {number} page - 页码，默认为1
     * @param {number} pageSize - 每页大小，默认为16
     * @returns {Promise<Object>} 直播列表数据
     */
    async getPersonalLiveList(page = 1, pageSize = 16) {
        const token = TokenManager.getToken();
        if (!token) {
            throw new Error('请先设置 Token');
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/live/personal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, page, page_size: pageSize })
            });
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to retrieve live stream list');
            }
            
            return data.data;
        } catch (error) {
            console.error('Failed to retrieve personal live stream list:', error);
            throw error;
        }
    }
};

