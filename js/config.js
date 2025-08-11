/**
 * API 配置文件
 * 根据部署环境自动选择 API 端点
 */
const APIConfig = {
    // 检测是否为本地开发环境
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.port !== '',
    
    // 生产环境配置
    production: {
        API_BASE_URL: '/api',
        SSO_AUTH_URL: '/auth/'
    },
    
    // 开发环境配置
    development: {
        API_BASE_URL: 'https://learn.ruc.edu.kg/api',
        SSO_AUTH_URL: 'https://learn.ruc.edu.kg/auth/'
    },
    
    // 获取当前环境的配置
    getCurrentConfig() {
        return this.isDevelopment ? this.development : this.production;
    }
};
