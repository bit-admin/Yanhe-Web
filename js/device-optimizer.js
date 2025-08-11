/**
 * 设备优化器
 * 根据不同设备类型提供优化配置
 */
class DeviceOptimizer {
    /**
     * 检测是否为 iOS 设备
     */
    static isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    
    /**
     * 检测是否为移动设备
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * 检测是否为 iOS Safari
     */
    static isIOSSafari() {
        const userAgent = navigator.userAgent;
        return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);
    }
    
    /**
     * 检测是否支持全屏API
     */
    static supportsFullscreen() {
        return !!(document.fullscreenEnabled || 
                 document.webkitFullscreenEnabled || 
                 document.mozFullScreenEnabled ||
                 document.msFullscreenEnabled);
    }
    
    /**
     * 获取优化配置
     */
    static getOptimizedConfig() {
        if (this.isIOS()) {
            return {
                maxMemorySlides: 5,      // 更保守的内存使用
                compressionQuality: 0.7,  // 更高的压缩率
                checkInterval: 3000,     // 更长的检测间隔
                enableAutoCleanup: true, // 启用自动清理
                thumbnailMaxWidth: 150,  // 更小的缩略图
                batchSize: 3,            // 批处理大小
                // 全屏相关配置
                fullscreenCaptureEnabled: true,     // 尝试在全屏时截图
                fullscreenRetryAttempts: 3,         // 全屏失败重试次数
                fullscreenRetryDelay: 500,          // 重试延迟 (ms)
                fullscreenMaxCanvasSize: 1920,      // 全屏时最大画布尺寸
                fullscreenFallbackQuality: 0.5      // 全屏失败时的降级质量
            };
        }
        
        if (this.isMobile()) {
            return {
                maxMemorySlides: 8,
                compressionQuality: 0.8,
                checkInterval: 2500,
                enableAutoCleanup: true,
                thumbnailMaxWidth: 180,
                batchSize: 5,
                // 全屏相关配置
                fullscreenCaptureEnabled: true,
                fullscreenRetryAttempts: 2,
                fullscreenRetryDelay: 300,
                fullscreenMaxCanvasSize: 1920,
                fullscreenFallbackQuality: 0.6
            };
        }
        
        // 桌面设备配置
        return {
            maxMemorySlides: 15,
            compressionQuality: 0.9,
            checkInterval: 2000,
            enableAutoCleanup: false,
            thumbnailMaxWidth: 200,
            batchSize: 10,
            // 全屏相关配置
            fullscreenCaptureEnabled: true,
            fullscreenRetryAttempts: 2,
            fullscreenRetryDelay: 200,
            fullscreenMaxCanvasSize: 3840,
            fullscreenFallbackQuality: 0.8
        };
    }
    
    /**
     * 获取存储配额信息
     */
    static async getStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage,
                    usagePercentage: (estimate.usage / estimate.quota) * 100
                };
            } catch (error) {
                console.warn('Failed to get storage estimate:', error);
            }
        }
        
        return null;
    }
    
    /**
     * 检查存储空间是否充足
     */
    static async hasEnoughStorage(requiredBytes = 50 * 1024 * 1024) { // 默认需要50MB
        const quota = await this.getStorageQuota();
        if (!quota) return true; // 无法检测时假设充足
        
        return quota.available > requiredBytes;
    }
    
    /**
     * 获取内存使用情况
     */
    static getMemoryInfo() {
        if ('memory' in performance) {
            return {
                usedJSMemory: performance.memory.usedJSMemory,
                totalJSMemory: performance.memory.totalJSMemory,
                jsMemoryLimit: performance.memory.jsMemoryLimit,
                usagePercentage: (performance.memory.usedJSMemory / performance.memory.jsMemoryLimit) * 100
            };
        }
        
        return null;
    }
    
    /**
     * 检查内存使用是否过高
     */
    static isMemoryUsageHigh(threshold = 70) {
        const memInfo = this.getMemoryInfo();
        if (!memInfo) return false;
        
        return memInfo.usagePercentage > threshold;
    }
    
    /**
     * 获取推荐的批处理设置
     */
    static getBatchSettings() {
        const config = this.getOptimizedConfig();
        const memInfo = this.getMemoryInfo();
        
        let batchSize = config.batchSize;
        
        // 根据内存使用情况调整批处理大小
        if (memInfo && memInfo.usagePercentage > 60) {
            batchSize = Math.max(1, Math.floor(batchSize * 0.7));
        }
        
        return {
            batchSize: batchSize,
            checkInterval: config.checkInterval,
            maxMemorySlides: config.maxMemorySlides,
            enableAutoCleanup: config.enableAutoCleanup
        };
    }
    
    /**
     * 获取全屏优化配置
     */
    static getFullscreenConfig() {
        const config = this.getOptimizedConfig();
        
        return {
            captureEnabled: config.fullscreenCaptureEnabled,
            retryAttempts: config.fullscreenRetryAttempts,
            retryDelay: config.fullscreenRetryDelay,
            maxCanvasSize: config.fullscreenMaxCanvasSize,
            fallbackQuality: config.fullscreenFallbackQuality,
            isIOSSafari: this.isIOSSafari(),
            supportsFullscreen: this.supportsFullscreen()
        };
    }
    
    /**
     * 检查是否应该在全屏时尝试截图
     */
    static shouldAttemptFullscreenCapture() {
        const config = this.getFullscreenConfig();
        
        // 即使是iOS Safari也要尝试
        return config.captureEnabled;
    }
    
    /**
     * 获取全屏截图的推荐策略
     */
    static getFullscreenCaptureStrategy() {
        if (this.isIOSSafari()) {
            return {
                strategy: 'aggressive-retry',
                description: 'iOS Safari: 积极重试，多种降级方案',
                retryAttempts: 5,
                useFallbackSizes: true,
                enableContinuousAttempt: true,
                fallbackSizes: [
                    { width: 1920, height: 1080 },
                    { width: 1280, height: 720 },
                    { width: 960, height: 540 },
                    { width: 640, height: 360 }
                ]
            };
        }
        
        if (this.isMobile()) {
            return {
                strategy: 'conservative-retry',
                description: '移动设备: 保守重试',
                retryAttempts: 3,
                useFallbackSizes: true,
                enableContinuousAttempt: true,
                fallbackSizes: [
                    { width: 1920, height: 1080 },
                    { width: 1280, height: 720 }
                ]
            };
        }
        
        return {
            strategy: 'standard-retry',
            description: '桌面设备: 标准重试',
            retryAttempts: 2,
            useFallbackSizes: false,
            enableContinuousAttempt: true,
            fallbackSizes: []
        };
    }
    
    /**
     * 获取视频元素检测策略
     */
    static getVideoDetectionStrategy() {
        return {
            // 按优先级排序的选择器
            selectors: [
                '#videoPlayer',                    // 主要选择器
                'video[id*="player"]',             // 包含player的video元素
                'video[class*="player"]',          // 包含player类的video元素
                'video[src]',                      // 有源的video元素
                'video'                            // 任何video元素
            ],
            
            // 全屏状态下的特殊选择器
            fullscreenSelectors: [
                'video',                           // 全屏元素内的video
                '*:fullscreen video',              // 标准全屏内的video
                '*:-webkit-full-screen video',    // WebKit全屏内的video
                '*:-moz-full-screen video'         // Firefox全屏内的video
            ],
            
            // 验证条件
            validationCriteria: {
                minReadyState: 2,                  // HAVE_CURRENT_DATA
                minWidth: 1,
                minHeight: 1,
                notPaused: false,                  // 允许暂停的视频
                hasVideoTracks: true
            }
        };
    }
}

// 确保类在全局作用域中可用
window.DeviceOptimizer = DeviceOptimizer;
