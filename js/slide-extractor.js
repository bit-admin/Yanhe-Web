/**
 * 幻灯片自动提取器
 * 从视频流中自动检测和提取变化的幻灯片
 */
class SlideExtractor {
    constructor() {
        this.isRunning = false;
        this.captureInterval = null;
        this.lastImageData = null;
        this.capturedSlides = [];
        this.captureCount = 0;
        
        // 存储管理器
        this.storageManager = new SlideStorageManager();
        this.loadedSlides = new Map(); // 内存中的幻灯片缓存，LRU策略
        this.currentStreamId = null;
        this.sessionState = null;
        this.isUIInitialized = false; // UI初始化标志
        
        // 设备优化配置
        this.deviceConfig = DeviceOptimizer.getOptimizedConfig();
        this.maxMemorySlides = this.deviceConfig.maxMemorySlides;
        
        // 参数配置 (硬编码固定值)
        this.config = {
            hammingThresholdLow: 0,      // 汉明距离下限
            hammingThresholdUp: 5,       // 汉明距离上限
            ssimThreshold: 0.999         // SSIM 相似度阈值
        };
        
        // 用户可配置参数 (从UI获取，应用设备优化)
        this.userConfig = {
            checkInterval: this.deviceConfig.checkInterval,  // 检测间隔
            enableDoubleVerification: true, // 启用二次验证
            verificationCount: 2         // 验证次数
        };
        
        // 二次验证相关状态
        this.verificationState = 'none'; // 'none' | 'verifying'
        this.currentVerification = 0;
        this.potentialNewImageData = null;
        this.verificationMethod = null;
        
        // 全屏处理相关
        this.fullscreenChangeHandler = null;
        
        // 不在构造函数中调用 initializeUI，而是在 init 方法中调用
    }
    
    /**
     * 异步初始化方法
     */
    async init() {
        try {
            await this.storageManager.initDB();
            
            // 获取当前直播ID
            this.currentStreamId = this.getCurrentStreamId();
            
            if (this.currentStreamId) {
                // 恢复会话状态
                await this.restoreSessionState();
                
                // 保存直播信息到数据库
                await this.saveCurrentStreamInfo();
            }
        } catch (error) {
            console.error('Failed to initialize SlideExtractor:', error);
        } finally {
            // 无论初始化是否成功，都要初始化UI
            this.initializeUI();
        }
    }
    
    /**
     * 获取当前直播ID
     */
    getCurrentStreamId() {
        // 从URL参数获取streamId
        const urlParams = new URLSearchParams(window.location.search);
        const streamId = urlParams.get('streamId');
        
        if (streamId) {
            return streamId;
        }
        
        // 后备方案：从sessionStorage获取
        const streamData = sessionStorage.getItem('currentStream');
        if (streamData) {
            try {
                const stream = JSON.parse(streamData);
                return stream.id;
            } catch (error) {
                console.error('Failed to parse stream data:', error);
            }
        }
        
        return null;
    }
    
    /**
     * 获取当前直播信息
     */
    getCurrentStreamInfo() {
        // 尝试从各种来源获取直播信息
        const urlParams = new URLSearchParams(window.location.search);
        const streamId = urlParams.get('streamId');
        
        if (streamId) {
            // 从localStorage获取缓存的直播信息
            const cachedStream = localStorage.getItem(`stream_${streamId}`);
            if (cachedStream) {
                try {
                    return JSON.parse(cachedStream);
                } catch (error) {
                    console.error('Failed to parse cached stream data:', error);
                }
            }
        }
        
        // 后备方案：从sessionStorage获取
        const sessionData = sessionStorage.getItem('currentStream');
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (error) {
                console.error('Failed to parse session stream data:', error);
            }
        }
        
        return null;
    }
    
    /**
     * 保存当前直播信息到数据库
     */
    async saveCurrentStreamInfo() {
        const streamInfo = this.getCurrentStreamInfo();
        if (streamInfo) {
            try {
                await this.storageManager.saveStreamInfo(streamInfo);
            } catch (error) {
                console.error('Failed to save stream info:', error);
            }
        }
    }
    
    /**
     * 恢复会话状态
     */
    async restoreSessionState() {
        if (!this.currentStreamId) return;
        
        try {
            this.sessionState = await this.storageManager.getSessionState(this.currentStreamId);
            
            if (this.sessionState) {
                // 恢复提取设置
                if (this.sessionState.extractionSettings) {
                    this.applySettings(this.sessionState.extractionSettings);
                }
                
                // 如果之前正在提取，询问是否继续
                if (this.sessionState.isExtracting) {
                    const message = window.i18n ? 
                        window.i18n.get('slide.session_restore_message', { count: this.sessionState.currentSlideCount }) :
                        `Detected that you were extracting slides while watching this live stream last time. Do you want to continue extraction?\n${this.sessionState.currentSlideCount} slides have been saved`;
                    
                    const shouldContinue = confirm(message);
                    
                    if (shouldContinue) {
                        // 恢复幻灯片预览
                        await this.restoreSlidesPreview();
                        // 可以选择自动开始提取
                        // this.startExtraction();
                    }
                } else {
                    // 仅恢复幻灯片预览，不自动开始提取
                    await this.restoreSlidesPreview();
                }
            }
        } catch (error) {
            console.error('Failed to restore session state:', error);
        }
    }
    
    /**
     * 恢复幻灯片预览
     */
    async restoreSlidesPreview() {
        if (!this.currentStreamId) return;
        
        try {
            const thumbnails = await this.storageManager.getSlidesForStream(this.currentStreamId);
            
            const previewContainer = document.getElementById('slidesPreview');
            if (previewContainer) {
                previewContainer.innerHTML = '';
                
                thumbnails.forEach((thumb, index) => {
                    this.addSlideToPreview(thumb.slideId, thumb.dataUrl, index + 1);
                });
            }
            
            this.updateSlideCount();
        } catch (error) {
            console.error('Failed to restore slides preview:', error);
        }
    }
    
    /**
     * 更新会话状态
     */
    async updateSessionState() {
        if (!this.currentStreamId) return;
        
        try {
            const slideCount = await this.getSlideCountForCurrentStream();
            
            await this.storageManager.updateSessionState(this.currentStreamId, {
                isExtracting: this.isRunning,
                extractionSettings: this.getUserSettings(),
                currentSlideCount: slideCount
            });
        } catch (error) {
            console.error('Failed to update session state:', error);
        }
    }
    
    /**
     * 获取当前直播的幻灯片数量
     */
    async getSlideCountForCurrentStream() {
        if (!this.currentStreamId) return 0;
        
        try {
            const thumbnails = await this.storageManager.getSlidesForStream(this.currentStreamId);
            return thumbnails.length;
        } catch (error) {
            console.error('Failed to get slide count:', error);
            return 0;
        }
    }

    /**
     * 获取下一张幻灯片的编号
     */
    async getNextSlideNumber() {
        if (this.currentStreamId) {
            try {
                const count = await this.getSlideCountForCurrentStream();
                return count + 1;
            } catch (error) {
                console.error('Failed to get next slide number:', error);
                return this.capturedSlides.length + 1;
            }
        } else {
            return this.capturedSlides.length + 1;
        }
    }
    
    /**
     * 获取用户设置
     */
    getUserSettings() {
        return {
            checkInterval: this.userConfig.checkInterval,
            enableDoubleVerification: this.userConfig.enableDoubleVerification,
            verificationCount: this.userConfig.verificationCount
        };
    }
    
    /**
     * 应用设置
     */
    applySettings(settings) {
        if (settings.checkInterval) {
            this.userConfig.checkInterval = settings.checkInterval;
            const input = document.getElementById('checkInterval');
            if (input) input.value = settings.checkInterval;
        }
        
        if (typeof settings.enableDoubleVerification === 'boolean') {
            this.userConfig.enableDoubleVerification = settings.enableDoubleVerification;
            const checkbox = document.getElementById('enableDoubleVerification');
            if (checkbox) checkbox.checked = settings.enableDoubleVerification;
        }
        
        if (settings.verificationCount) {
            this.userConfig.verificationCount = settings.verificationCount;
            const input = document.getElementById('verificationCount');
            if (input) input.value = settings.verificationCount;
        }
    }
    
    /**
     * 内存管理
     */
    manageMemoryCache() {
        // LRU 策略清理内存缓存
        if (this.loadedSlides.size > this.maxMemorySlides) {
            const oldestKey = this.loadedSlides.keys().next().value;
            this.loadedSlides.delete(oldestKey);
        }
        
        // 如果内存使用过高，强制清理
        if (DeviceOptimizer.isMemoryUsageHigh()) {
            this.loadedSlides.clear();
            console.log('Memory usage high, cleared slide cache');
        }
    }
    
    /**
     * 清空当前直播的幻灯片
     */
    async clearSlides() {
        if (!this.currentStreamId) {
            // 如果没有当前直播ID，清空内存中的幻灯片
            this.clearSlidesFromMemory();
            return;
        }
        
        try {
            const slideCount = await this.getSlideCountForCurrentStream();
            
            if (slideCount === 0) {
                const message = window.i18n ? window.i18n.get('slide.no_slides_to_clear') : 'No slides to clear';
                this.showMessage(message);
                return;
            }
            
            const confirmMessage = window.i18n ? 
                window.i18n.get('slide.confirm_delete_all', { count: slideCount }) :
                `Are you sure you want to delete all ${slideCount} slides from the current live stream? This action cannot be undone!\n\nThis will permanently delete the slide data stored in the database.`;
            
            if (confirm(confirmMessage)) {
                // 删除数据库中的幻灯片数据
                await this.storageManager.deleteStreamSlides(this.currentStreamId);
                
                // 清空预览区域
                const previewContainer = document.getElementById('slidesPreview');
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                }
                
                // 重置内存缓存
                this.loadedSlides.clear();
                this.lastImageData = null;
                this.resetVerificationState();
                
                this.updateSlideCount();
                
                // 更新会话状态
                await this.updateSessionState();
                
                const successMessage = window.i18n ? window.i18n.get('slide.slides_deleted') : 'Slides deleted successfully';
                this.showMessage(successMessage);
            }
        } catch (error) {
            console.error('Failed to clear slides:', error);
            const errorMessage = window.i18n ? window.i18n.get('slide.delete_failed') : 'Delete failed';
            this.showMessage(errorMessage, 'error');
        }
    }
    
    /**
     * 清空内存中的幻灯片（降级方案）
     */
    clearSlidesFromMemory() {
        if (this.capturedSlides.length === 0) {
            const message = window.i18n ? window.i18n.get('slide.no_slides_to_clear') : 'No slides to clear';
            this.showMessage(message);
            return;
        }
        
        const confirmMessage = window.i18n ? 
            window.i18n.get('slide.confirm_clear', { count: this.capturedSlides.length }) :
            `Are you sure you want to clear all ${this.capturedSlides.length} slides? This action cannot be undone!`;
        
        if (confirm(confirmMessage)) {
            this.capturedSlides = [];
            
            // 清空预览区域
            const previewContainer = document.getElementById('slidesPreview');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }
            
            // 重置状态
            this.loadedSlides.clear();
            this.lastImageData = null;
            this.resetVerificationState();
            
            this.updateSlideCount();
            const successMessage = window.i18n ? window.i18n.get('slide.slides_deleted') : 'Slides cleared';
            this.showMessage(successMessage);
        }
    }
    
    /**
     * 重置验证状态
     */
    resetVerificationState() {
        this.verificationState = 'none';
        this.currentVerification = 0;
        this.potentialNewImageData = null;
        this.verificationMethod = null;
    }
    
    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 简单的消息显示，可以后续改进为更好的UI
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
        
        // 也可以显示在状态区域
        const statusElement = document.getElementById('slideStatus');
        if (statusElement) {
            statusElement.textContent = message;
            setTimeout(() => {
                const runningText = window.i18n ? window.i18n.get('slide.running') : 'Running...';
                const stoppedText = window.i18n ? window.i18n.get('slide.stopped') : 'Stopped';
                statusElement.textContent = this.isRunning ? runningText : stoppedText;
            }, 3000);
        }
    }
    
    /**
     * 初始化 UI 事件
     */
    initializeUI() {
        // 防止重复初始化
        if (this.isUIInitialized) {
            return;
        }
        
        // 启用/禁用开关
        const extractionToggle = document.getElementById('enableSlideExtraction');
        
        if (extractionToggle) {
            // 移除可能存在的旧事件监听器
            const newToggle = extractionToggle.cloneNode(true);
            extractionToggle.parentNode.replaceChild(newToggle, extractionToggle);
            
            newToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startExtraction();
                } else {
                    this.stopExtraction();
                }
            });
        }
        
        // 设置按钮点击事件
        const settingsBtn = document.getElementById('slideSettingsBtn');
        if (settingsBtn) {
            // 移除可能存在的旧事件监听器
            const newSettingsBtn = settingsBtn.cloneNode(true);
            settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
            
            newSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsPopup();
            });
        }
        
        // 点击页面其他地方关闭设置弹窗
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('slideSettingsPopup');
            const settingsBtn = document.getElementById('slideSettingsBtn');
            
            if (popup && settingsBtn && !popup.contains(e.target) && !settingsBtn.contains(e.target)) {
                this.hideSettingsPopup();
            }
        });
        
        // 下载按钮
        const downloadBtn = document.getElementById('downloadSlidesBtn');
        if (downloadBtn) {
            // 移除可能存在的旧事件监听器
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            
            newDownloadBtn.addEventListener('click', () => {
                this.downloadSlidesAsZip();
            });
        }
        
        // 清空按钮
        const clearBtn = document.getElementById('clearSlidesBtn');
        if (clearBtn) {
            // 移除可能存在的旧事件监听器
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            
            newClearBtn.addEventListener('click', () => {
                this.clearSlides();
            });
        }
        
        // 监听配置参数变化
        const checkIntervalInput = document.getElementById('checkInterval');
        if (checkIntervalInput) {
            checkIntervalInput.addEventListener('change', () => {
                this.updateUserConfig();
            });
        }
        
        const doubleVerificationInput = document.getElementById('enableDoubleVerification');
        if (doubleVerificationInput) {
            doubleVerificationInput.addEventListener('change', () => {
                this.updateUserConfig();
            });
        }
        
        const verificationCountInput = document.getElementById('verificationCount');
        if (verificationCountInput) {
            verificationCountInput.addEventListener('change', () => {
                this.updateUserConfig();
            });
        }
        
        // 同步设备优化的默认值到UI
        this.syncDeviceConfigToUI();
        
        // 标记UI已初始化
        this.isUIInitialized = true;
    }
    
    /**
     * 将设备优化配置同步到UI
     */
    syncDeviceConfigToUI() {
        // 同步检测间隔
        const checkIntervalInput = document.getElementById('checkInterval');
        if (checkIntervalInput) {
            checkIntervalInput.value = this.userConfig.checkInterval;
        }
        
        // 这里可以添加其他配置项的同步
        // 如果将来需要将 deviceConfig 的其他属性也显示在UI中
    }

    /**
     * 切换设置弹窗显示状态
     */
    toggleSettingsPopup() {
        const popup = document.getElementById('slideSettingsPopup');
        if (popup.classList.contains('show')) {
            this.hideSettingsPopup();
        } else {
            this.showSettingsPopup();
        }
    }
    
    /**
     * 显示设置弹窗
     */
    showSettingsPopup() {
        const popup = document.getElementById('slideSettingsPopup');
        popup.classList.add('show');
    }
    
    /**
     * 隐藏设置弹窗
     */
    hideSettingsPopup() {
        const popup = document.getElementById('slideSettingsPopup');
        popup.classList.remove('show');
    }
    

    
    /**
     * 更新用户配置
     */
    updateUserConfig() {
        const checkIntervalInput = document.getElementById('checkInterval');
        const doubleVerificationInput = document.getElementById('enableDoubleVerification');
        const verificationCountInput = document.getElementById('verificationCount');
        
        if (checkIntervalInput) {
            this.userConfig.checkInterval = parseInt(checkIntervalInput.value);
        }
        
        if (doubleVerificationInput) {
            this.userConfig.enableDoubleVerification = doubleVerificationInput.checked;
        }
        
        if (verificationCountInput) {
            this.userConfig.verificationCount = parseInt(verificationCountInput.value);
        }
        
        // 如果正在运行，重新启动以应用新配置
        if (this.isRunning) {
            const video = this.getVideoElement();
            if (video) {
                clearInterval(this.captureInterval);
                this.captureInterval = setInterval(() => {
                    this.captureAndCompareWithFallback();
                }, this.userConfig.checkInterval);
            }
        }
    }
    
    /**
     * 开始提取幻灯片
     */
    startExtraction() {
        if (this.isRunning) return;
        
        const video = this.getVideoElement();
        if (!video) {
            const errorMessage = window.i18n ? window.i18n.get('slide.error_no_player') : 'Video player not found, please start playing video first';
            this.showError(errorMessage);
            const extractionToggle = document.getElementById('enableSlideExtraction');
            if (extractionToggle) {
                extractionToggle.checked = false;
            }
            return;
        }
        
        this.isRunning = true;
        const runningText = window.i18n ? window.i18n.get('slide.running') : 'Running...';
        this.updateStatus(runningText, 'running');
        
        // 设置全屏状态监听
        this.setupFullscreenListeners();
        
        // 开始定时截取
        this.updateUserConfig(); // 确保使用最新配置
        this.captureInterval = setInterval(() => {
            this.captureAndCompareWithFallback();
        }, this.userConfig.checkInterval);
    }
    
    /**
     * 停止提取幻灯片
     */
    stopExtraction() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
        
        // 移除全屏事件监听
        this.removeFullscreenListeners();
        
        // 重置验证状态
        this.resetVerificationState();
        
        const stoppedText = window.i18n ? window.i18n.get('slide.stopped') : 'Stopped';
        this.updateStatus(stoppedText, 'stopped');
    }
    
    /**
     * 获取视频元素（支持全屏状态）
     */
    getVideoElement() {
        const strategy = DeviceOptimizer.getVideoDetectionStrategy();
        
        // 如果在全屏状态，优先使用全屏选择器
        if (this.isInFullscreen()) {
            // 尝试从全屏元素获取视频
            const fullscreenElement = document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.mozFullScreenElement || 
                                    document.msFullscreenElement;
            
            if (fullscreenElement) {
                if (fullscreenElement.tagName === 'VIDEO') {
                    if (this.isVideoAccessible(fullscreenElement)) {
                        return fullscreenElement;
                    }
                }
                
                // 在全屏元素内查找视频
                for (const selector of strategy.fullscreenSelectors) {
                    const video = fullscreenElement.querySelector('video');
                    if (video && this.isVideoAccessible(video)) {
                        return video;
                    }
                }
            }
        }
        
        // 使用标准选择器
        for (const selector of strategy.selectors) {
            const video = document.querySelector(selector);
            if (video && this.isVideoAccessible(video)) {
                return video;
            }
        }
        
        return null;
    }
    
    /**
     * 检查视频元素是否可访问
     */
    isVideoAccessible(video) {
        try {
            if (!video) return false;
            
            const criteria = DeviceOptimizer.getVideoDetectionStrategy().validationCriteria;
            
            // 基本检查
            if (video.readyState < criteria.minReadyState) return false;
            if (video.videoWidth < criteria.minWidth) return false;
            if (video.videoHeight < criteria.minHeight) return false;
            
            // 暂停状态检查（根据配置决定是否允许暂停的视频）
            if (criteria.notPaused && video.paused) return false;
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 检查是否处于全屏状态
     */
    isInFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement);
    }
    
    /**
     * 设置全屏事件监听
     */
    setupFullscreenListeners() {
        // 防止重复添加监听器
        this.removeFullscreenListeners();
        
        this.fullscreenChangeHandler = () => {
            console.log('Fullscreen state changed:', this.isInFullscreen());
            // 全屏状态变化时，可能需要重新获取视频元素引用
            // 这里暂时只记录，具体处理在 captureAndCompareWithFallback 中进行
        };
        
        // 添加全屏变化事件监听
        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('msfullscreenchange', this.fullscreenChangeHandler);
        
        // iOS Safari 特殊处理
        if (this.isIOSSafari()) {
            // iOS Safari 可能需要特殊的全屏处理
            const video = document.getElementById('videoPlayer');
            if (video) {
                video.addEventListener('webkitbeginfullscreen', this.fullscreenChangeHandler);
                video.addEventListener('webkitendfullscreen', this.fullscreenChangeHandler);
            }
        }
    }
    
    /**
     * 移除全屏事件监听
     */
    removeFullscreenListeners() {
        if (this.fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('msfullscreenchange', this.fullscreenChangeHandler);
            
            // iOS Safari 特殊处理
            if (this.isIOSSafari()) {
                const video = document.getElementById('videoPlayer');
                if (video) {
                    video.removeEventListener('webkitbeginfullscreen', this.fullscreenChangeHandler);
                    video.removeEventListener('webkitendfullscreen', this.fullscreenChangeHandler);
                }
            }
            
            this.fullscreenChangeHandler = null;
        }
    }
    
    /**
     * 检测是否为 iOS Safari
     */
    isIOSSafari() {
        return DeviceOptimizer.isIOSSafari();
    }
    
    /**
     * 带降级处理的截取和比较方法
     */
    async captureAndCompareWithFallback() {
        try {
            // 动态获取视频元素
            const video = this.getVideoElement();
            if (!video) {
                // 如果无法获取视频元素，但正在验证状态，重置验证状态
                if (this.verificationState === 'verifying') {
                    console.warn('captureAndCompareWithFallback: No video element available during verification, resetting verification state');
                    this.resetVerificationState();
                }
                return;
            }
            
            // 检查全屏状态并记录
            const isFullscreen = this.isInFullscreen();
            if (isFullscreen) {
                console.log('Operating in fullscreen mode, using optimized capture strategy');
            }
            
            // 调用原有的截取比较逻辑
            await this.captureAndCompare(video);
            
        } catch (error) {
            console.warn('captureAndCompareWithFallback: Error occurred:', error);
            
            // 根据错误类型和设备类型决定处理策略
            const shouldContinue = this.handleCaptureError(error);
            
            if (!shouldContinue) {
                // 如果正在验证状态，重置验证状态
                if (this.verificationState === 'verifying') {
                    console.warn('captureAndCompareWithFallback: Error during verification, resetting verification state');
                    this.resetVerificationState();
                }
            }
        }
    }
    
    /**
     * 处理截图错误
     */
    handleCaptureError(error) {
        const isFullscreen = this.isInFullscreen();
        const isIOSSafari = this.isIOSSafari();
        
        if (error.name === 'SecurityError' && isFullscreen) {
            if (isIOSSafari) {
                console.log('iOS Safari全屏安全错误 - 继续尝试，这是预期行为');
                return true; // 继续运行
            } else {
                console.log('桌面浏览器全屏安全错误 - 等待下次尝试');
                return true; // 继续运行
            }
        }
        
        if (error.name === 'InvalidStateError' && isFullscreen) {
            console.log('全屏状态无效错误 - 继续尝试');
            return true; // 继续运行
        }
        
        // 其他错误类型
        console.warn('未知错误类型:', error);
        return false; // 需要重置状态
    }
    
    /**
     * 截取并比较图像
     */
    async captureAndCompare(video) {
        try {
            // 检查视频是否可播放
            if (video.readyState < 2) {
                return;
            }
            
            // 截取当前帧
            const imageData = this.captureFrame(video);
            if (!imageData) {
                // 如果截取失败，但正在验证状态，重置验证状态
                if (this.verificationState === 'verifying') {
                    console.warn('captureAndCompare: Failed to capture frame during verification, resetting verification state');
                    this.resetVerificationState();
                }
                return;
            }
            
            // 第一次截取，直接保存
            if (!this.lastImageData) {
                this.saveSlide(imageData, 'Slide 1');
                this.lastImageData = imageData;
                return;
            }
            
            // 处理二次验证逻辑
            if (this.userConfig.enableDoubleVerification && this.verificationState !== 'none') {
                await this.handleVerification(imageData);
            } else {
                await this.handleNewImage(imageData);
            }
            
        } catch (error) {
            // 静默处理错误，但在验证状态时重置
            if (this.verificationState === 'verifying') {
                console.warn('captureAndCompare: Error during verification, resetting verification state:', error);
                this.resetVerificationState();
            }
        }
    }
    
    /**
     * 处理验证状态下的图像
     */
    async handleVerification(imageData) {
        // 检查验证所需的数据是否有效
        if (!this.potentialNewImageData) {
            console.error('handleVerification: potentialNewImageData is null, resetting verification state');
            this.resetVerificationState();
            return;
        }
        
        const verifyResult = this.compareImages(this.potentialNewImageData, imageData);
        
        if (verifyResult) {
            // 验证失败：新幻灯片不稳定
            const failedText = window.i18n ? window.i18n.get('slide.verification_failed') : 'Verification failed, re-detecting...';
            this.updateStatus(failedText, 'error');
            this.resetVerificationState();
        } else {
            // 验证通过
            this.currentVerification++;
            
            if (this.currentVerification < this.userConfig.verificationCount) {
                const verifyingText = window.i18n ? window.i18n.get('slide.verifying') : 'Verifying...';
                this.updateStatus(`${verifyingText} (${this.currentVerification}/${this.userConfig.verificationCount})`, 'verifying');
            } else {
                // 所有验证都通过，保存幻灯片
                const slideNumber = await this.getNextSlideNumber();
                this.saveSlide(this.potentialNewImageData, `Slide ${slideNumber}`);
                this.lastImageData = this.potentialNewImageData;
                this.resetVerificationState();
                const runningText = window.i18n ? window.i18n.get('slide.running') : 'Running...';
                this.updateStatus(runningText, 'running');
            }
        }
    }
    
    /**
     * 处理新图像检测
     */
    async handleNewImage(imageData) {
        const hasChanged = this.compareImages(this.lastImageData, imageData);
        
        if (hasChanged) {
            if (this.userConfig.enableDoubleVerification) {
                // 开始二次验证
                this.verificationState = 'verifying';
                this.currentVerification = 0;
                this.potentialNewImageData = imageData;
                const changeDetectedText = window.i18n ? window.i18n.get('slide.change_detected') : 'Change detected, starting verification...';
                this.updateStatus(changeDetectedText, 'verifying');
            } else {
                // 直接保存
                const slideNumber = await this.getNextSlideNumber();
                this.saveSlide(imageData, `Slide ${slideNumber}`);
                this.lastImageData = imageData;
            }
        }
    }
    
    /**
     * 重置验证状态
     */
    resetVerificationState() {
        this.verificationState = 'none';
        this.currentVerification = 0;
        this.potentialNewImageData = null;
        this.verificationMethod = null;
    }
    
    /**
     * 从视频元素截取当前帧
     */
    captureFrame(video) {
        if (!video || video.readyState < 2) {
            return null;
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }
        
        // 检查是否应该在全屏时尝试截图
        const shouldAttempt = DeviceOptimizer.shouldAttemptFullscreenCapture();
        const isFullscreen = this.isInFullscreen();
        
        if (isFullscreen && !shouldAttempt) {
            console.log('Skipping capture in fullscreen mode per device configuration');
            return null;
        }
        
        // 根据设备获取截图策略
        const strategy = DeviceOptimizer.getFullscreenCaptureStrategy();
        
        if (isFullscreen) {
            return this.captureFrameWithStrategy(video, strategy);
        } else {
            return this.captureFrameStandard(video);
        }
    }
    
    /**
     * 标准模式截图
     */
    captureFrameStandard(video) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (!this.validateImageData(imageData)) {
                return null;
            }
            
            return imageData;
        } catch (error) {
            console.warn('Standard capture failed:', error);
            return null;
        }
    }
    
    /**
     * 使用策略进行截图（全屏模式）
     */
    captureFrameWithStrategy(video, strategy) {
        console.log(`Using capture strategy: ${strategy.strategy} - ${strategy.description}`);
        
        let lastError = null;
        
        // 根据策略尝试不同的截图方法
        for (let attempt = 0; attempt < strategy.retryAttempts; attempt++) {
            console.log(`Capture attempt ${attempt + 1}/${strategy.retryAttempts}`);
            
            try {
                // 尝试不同的画布尺寸
                if (strategy.useFallbackSizes && strategy.fallbackSizes.length > 0) {
                    const sizeIndex = Math.min(attempt, strategy.fallbackSizes.length - 1);
                    const targetSize = strategy.fallbackSizes[sizeIndex];
                    const result = this.captureFrameWithSize(video, targetSize);
                    if (result) return result;
                } else {
                    const result = this.captureFrameStandard(video);
                    if (result) return result;
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`Capture attempt ${attempt + 1} failed:`, error);
                
                // 在重试之间添加延迟
                if (attempt < strategy.retryAttempts - 1) {
                    // 这里不能使用 sleep，因为这是同步函数
                    // 但我们可以记录错误并继续尝试
                }
            }
        }
        
        // 所有尝试都失败了，但仍然返回 null 而不是抛出错误
        // 这样可以让提取逻辑继续运行
        console.warn(`All ${strategy.retryAttempts} capture attempts failed. Last error:`, lastError);
        
        // 在iOS Safari上，即使失败也要继续尝试
        if (this.isIOSSafari() && strategy.enableContinuousAttempt) {
            console.log('iOS Safari: 继续尝试，不中断提取流程');
        }
        
        return null;
    }
    
    /**
     * 使用指定尺寸截图
     */
    captureFrameWithSize(video, targetSize) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算合适的尺寸
            const videoRatio = video.videoWidth / video.videoHeight;
            const targetRatio = targetSize.width / targetSize.height;
            
            let drawWidth, drawHeight;
            
            if (videoRatio > targetRatio) {
                // 视频更宽，以高度为准
                drawHeight = targetSize.height;
                drawWidth = drawHeight * videoRatio;
            } else {
                // 视频更高，以宽度为准
                drawWidth = targetSize.width;
                drawHeight = drawWidth / videoRatio;
            }
            
            canvas.width = Math.min(drawWidth, targetSize.width);
            canvas.height = Math.min(drawHeight, targetSize.height);
            
            console.log(`Attempting capture with canvas size: ${canvas.width}x${canvas.height}`);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (!this.validateImageData(imageData)) {
                return null;
            }
            
            console.log(`✓ Successful capture with size: ${canvas.width}x${canvas.height}`);
            return imageData;
            
        } catch (error) {
            console.warn(`Capture with size ${targetSize.width}x${targetSize.height} failed:`, error);
            return null;
        }
    }
    
    /**
     * 验证图像数据有效性
     */
    validateImageData(imageData) {
        if (!imageData || !imageData.data || imageData.data.length === 0) {
            return false;
        }
        
        if (imageData.width === 0 || imageData.height === 0) {
            return false;
        }
        
        const isFullscreen = this.isInFullscreen();
        const isIOSSafari = this.isIOSSafari();
        
        // 检查是否为完全黑色图像
        let nonZeroPixels = 0;
        let totalPixelValue = 0;
        const sampleSize = Math.min(100, imageData.data.length / 4); // 采样检查
        
        for (let i = 0; i < sampleSize * 4; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            
            totalPixelValue += r + g + b;
            
            if (r > 0 || g > 0 || b > 0) {
                nonZeroPixels++;
                if (nonZeroPixels > 5) break; // 提前退出，有足够的非零像素
            }
        }
        
        // 全屏模式下的宽松验证
        if (isFullscreen) {
            if (isIOSSafari) {
                // iOS Safari 全屏模式：最宽松的验证
                // 即使是黑屏也可能包含有用信息
                console.log(`iOS Safari全屏验证: 非零像素=${nonZeroPixels}, 总像素值=${totalPixelValue}`);
                return totalPixelValue > 0 || nonZeroPixels > 0;
            } else {
                // 其他浏览器全屏模式：稍微宽松的验证
                console.log(`全屏模式验证: 非零像素=${nonZeroPixels}, 总像素值=${totalPixelValue}`);
                return nonZeroPixels > 0 || totalPixelValue > (sampleSize * 10); // 允许更低的阈值
            }
        }
        
        // 标准模式验证
        return nonZeroPixels > 0;
    }
    
    /**
     * 比较两个图像是否有显著变化 (使用两级比较：pHash + SSIM)
     */
    compareImages(img1Data, img2Data) {
        try {
            // 检查输入参数是否有效
            if (!img1Data || !img2Data) {
                console.warn('compareImages: One or both images are null/undefined');
                return false; // 如果有空值，认为没有变化
            }
            
            // 第一级：计算感知哈希
            const hash1 = this.calculatePerceptualHash(img1Data);
            const hash2 = this.calculatePerceptualHash(img2Data);
            
            // 计算汉明距离
            const hammingDistance = this.calculateHammingDistance(hash1, hash2);
            
            if (hammingDistance > this.config.hammingThresholdUp) {
                // 哈希检测到显著变化
                return true;
            } else if (hammingDistance <= this.config.hammingThresholdLow) {
                // 哈希完全相同
                return false;
            } else {
                // 边界情况，使用 SSIM 精确比较
                const ssim = this.calculateSSIM(img1Data, img2Data);
                return ssim < this.config.ssimThreshold;
            }
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 计算感知哈希 (简化的 DCT 方法)
     */
    calculatePerceptualHash(imageData) {
        if (!imageData) {
            console.warn('calculatePerceptualHash: imageData is null');
            return 0;
        }
        
        // 缩放到 8x8
        const resized = this.resizeImageData(imageData, 8, 8);
        
        // 转换为灰度
        const grayscale = this.convertToGrayscale(resized);
        
        // 简化的 DCT 变换
        const dctCoeffs = this.applySimplifiedDCT(grayscale.data, 8);
        
        // 计算平均值 (排除 DC 分量)
        const avg = dctCoeffs.slice(1).reduce((sum, val) => sum + val, 0) / (dctCoeffs.length - 1);
        
        // 生成哈希
        let hash = 0;
        for (let i = 1; i < Math.min(dctCoeffs.length, 33); i++) { // 使用前32个 AC 分量
            hash = hash * 2 + (dctCoeffs[i] > avg ? 1 : 0);
        }
        
        return hash;
    }
    
    /**
     * 缩放 ImageData
     */
    resizeImageData(imageData, newWidth, newHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // 创建临时 canvas 来绘制原图
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // 缩放绘制
        ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
        
        return ctx.getImageData(0, 0, newWidth, newHeight);
    }
    
    /**
     * 转换为灰度
     */
    convertToGrayscale(imageData) {
        const data = new Uint8ClampedArray(imageData.data);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Alpha 保持不变
        }
        
        return new ImageData(data, imageData.width, imageData.height);
    }
    
    /**
     * 简化的 DCT 变换
     */
    applySimplifiedDCT(pixels, size) {
        const coeffs = [];
        
        for (let u = 0; u < size; u++) {
            for (let v = 0; v < size; v++) {
                let sum = 0;
                for (let x = 0; x < size; x++) {
                    for (let y = 0; y < size; y++) {
                        const pixel = pixels[(y * size + x) * 4]; // 取 R 分量 (灰度图都相同)
                        sum += pixel * 
                               Math.cos((2 * x + 1) * u * Math.PI / (2 * size)) *
                               Math.cos((2 * y + 1) * v * Math.PI / (2 * size));
                    }
                }
                
                const c_u = u === 0 ? 1 / Math.sqrt(2) : 1;
                const c_v = v === 0 ? 1 / Math.sqrt(2) : 1;
                coeffs.push(0.25 * c_u * c_v * sum);
            }
        }
        
        return coeffs;
    }
    
    /**
     * 计算汉明距离
     */
    calculateHammingDistance(hash1, hash2) {
        let xor = hash1 ^ hash2;
        let distance = 0;
        
        while (xor) {
            distance += xor & 1;
            xor >>>= 1;
        }
        
        return distance;
    }
    
    /**
     * 计算 SSIM (结构相似性指数)
     */
    calculateSSIM(img1Data, img2Data) {
        // 转换为灰度
        const gray1 = this.convertToGrayscale(img1Data);
        const gray2 = this.convertToGrayscale(img2Data);
        
        // 计算均值
        let mean1 = 0, mean2 = 0;
        const pixelCount = gray1.width * gray1.height;
        
        for (let i = 0; i < gray1.data.length; i += 4) {
            mean1 += gray1.data[i];
            mean2 += gray2.data[i];
        }
        mean1 /= pixelCount;
        mean2 /= pixelCount;
        
        // 计算方差和协方差
        let var1 = 0, var2 = 0, covar = 0;
        for (let i = 0; i < gray1.data.length; i += 4) {
            const diff1 = gray1.data[i] - mean1;
            const diff2 = gray2.data[i] - mean2;
            var1 += diff1 * diff1;
            var2 += diff2 * diff2;
            covar += diff1 * diff2;
        }
        var1 /= pixelCount;
        var2 /= pixelCount;
        covar /= pixelCount;
        
        // 稳定性常数
        const C1 = 0.01 * 255 * 0.01 * 255;
        const C2 = 0.03 * 255 * 0.03 * 255;
        
        // 计算 SSIM
        const numerator = (2 * mean1 * mean2 + C1) * (2 * covar + C2);
        const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2);
        
        return numerator / denominator;
    }
    
    /**
     * 保存幻灯片
     */
    async saveSlide(imageData, title) {
        // 验证输入参数
        if (!imageData) {
            console.error('saveSlide: imageData is null or undefined');
            return;
        }
        
        if (!this.currentStreamId) {
            console.error('No current stream ID available');
            return;
        }
        
        // 转换为 Canvas 并生成 Blob
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', this.deviceConfig.compressionQuality);
        });
        
        try {
            // 保存到 IndexedDB
            const slideData = {
                title,
                width: imageData.width,
                height: imageData.height,
                timestamp: new Date().toISOString()
            };
            
            const slideId = await this.storageManager.saveSlide(this.currentStreamId, slideData, blob);
            
            // 加载缩略图到预览区域
            const thumbnails = await this.storageManager.getSlidesForStream(this.currentStreamId);
            const latestThumb = thumbnails[thumbnails.length - 1];
            this.addSlideToPreview(slideId, latestThumb.dataUrl, thumbnails.length);
            
            // 更新会话状态
            await this.updateSessionState();
            
            // 内存管理
            this.manageMemoryCache();
            
            this.updateSlideCount();
        } catch (error) {
            console.error('Failed to save slide:', error);
            // 降级到内存存储
            this.saveSlideToMemory(imageData, title);
        }
    }
    
    /**
     * 降级保存到内存（原有逻辑）
     */
    saveSlideToMemory(imageData, title) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
            const slide = {
                id: Date.now() + Math.random(),
                title: title,
                timestamp: new Date().toLocaleString(),
                blob: blob,
                dataUrl: canvas.toDataURL('image/png')
            };
            
            this.capturedSlides.push(slide);
            this.updateSlideCount();
            this.addSlideToPreviewLegacy(slide);
        }, 'image/png');
    }
    
    /**
     * 更新幻灯片数量显示
     */
    async updateSlideCount() {
        let count = 0;
        
        if (this.currentStreamId) {
            try {
                count = await this.getSlideCountForCurrentStream();
            } catch (error) {
                console.error('Failed to get slide count from storage:', error);
                count = this.capturedSlides.length; // 降级到内存计数
            }
        } else {
            count = this.capturedSlides.length;
        }
        
        const countElement = document.getElementById('slidesCount');
        if (countElement) {
            countElement.textContent = count;
        }
        
        const downloadBtn = document.getElementById('downloadSlidesBtn');
        if (downloadBtn) {
            downloadBtn.disabled = count === 0;
        }
    }
    
    /**
     * 添加幻灯片到预览区域（支持新的持久化格式）
     */
    addSlideToPreview(slideIdOrSlide, dataUrl = null, index = null) {
        const previewContainer = document.getElementById('slidesPreview');
        if (!previewContainer) return;
        
        let slideId, imageDataUrl, slideIndex;
        
        // 判断参数格式
        if (typeof slideIdOrSlide === 'string') {
            // 新格式：slideId, dataUrl, index
            slideId = slideIdOrSlide;
            imageDataUrl = dataUrl;
            slideIndex = index;
        } else {
            // 旧格式：slide 对象
            const slide = slideIdOrSlide;
            slideId = slide.id;
            imageDataUrl = slide.dataUrl;
            slideIndex = index || 'N/A'; // 如果没有提供索引，显示 N/A
        }
        
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slide-thumbnail';
        slideDiv.dataset.slideId = slideId;
        slideDiv.innerHTML = `
            <img src="${imageDataUrl}" alt="Slide ${slideIndex}">
            <div class="slide-index">${slideIndex}</div>
        `;
        
        // 点击查看大图
        slideDiv.addEventListener('click', async () => {
            await this.viewSlideFullscreen(slideId, imageDataUrl);
        });
        
        previewContainer.appendChild(slideDiv);
        
        // 在预览容器内滚动到最新的幻灯片，避免影响整个页面
        // 使用 scrollTop 而不是 scrollIntoView 来避免页面跳转
        setTimeout(() => {
            previewContainer.scrollTop = previewContainer.scrollHeight;
        }, 100);
    }
    
    /**
     * 添加幻灯片到预览区域（旧版本兼容）
     */
    addSlideToPreviewLegacy(slide) {
        const previewContainer = document.getElementById('slidesPreview');
        if (!previewContainer) return;
        
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slide-thumbnail';
        // 获取当前预览容器中的幻灯片数量作为索引
        const currentSlideCount = previewContainer.children.length + 1;
        slideDiv.innerHTML = `
            <img src="${slide.dataUrl}" alt="${slide.title}">
            <div class="slide-index">${currentSlideCount}</div>
        `;
        
        // 点击查看大图
        slideDiv.addEventListener('click', async () => {
            await this.viewSlideFullscreenLegacy(slide);
        });
        
        previewContainer.appendChild(slideDiv);
        
        // 在预览容器内滚动到最新的幻灯片，避免影响整个页面
        // 使用 scrollTop 而不是 scrollIntoView 来避免页面跳转
        setTimeout(() => {
            previewContainer.scrollTop = previewContainer.scrollHeight;
        }, 100);
    }
    
    /**
     * 查看幻灯片全屏
     */
    async viewSlideFullscreen(slideIdOrSlide, dataUrl = null) {
        let slideId, thumbnailDataUrl;
        
        // 判断参数格式
        if (typeof slideIdOrSlide === 'string') {
            // 新格式：slideId, dataUrl（缩略图）
            slideId = slideIdOrSlide;
            thumbnailDataUrl = dataUrl;
        } else {
            // 旧格式：slide 对象
            const slide = slideIdOrSlide;
            slideId = slide.id;
            thumbnailDataUrl = slide.dataUrl;
        }
        
        // 创建全屏查看器
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;
        
        // 创建控制栏
        const controlBar = document.createElement('div');
        controlBar.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10001;
        `;
        
        // 下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = 'Download';
        downloadBtn.style.cssText = `
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            await this.downloadSlideById(slideId);
        };
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕ Close';
        closeBtn.style.cssText = `
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeModal();
        };
        
        controlBar.appendChild(downloadBtn);
        controlBar.appendChild(closeBtn);
        
        // 创建加载指示器
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            color: white;
            font-size: 18px;
            text-align: center;
        `;
        loadingDiv.innerHTML = `
            <div style="margin-bottom: 10px;">Loading high-resolution image...</div>
            <div style="animation: spin 1s linear infinite; width: 30px; height: 30px; border: 3px solid #ffffff; border-top: 3px solid transparent; border-radius: 50%; margin: 0 auto;"></div>
        `;
        
        // 添加旋转动画的CSS
        if (!document.getElementById('spinAnimation')) {
            const style = document.createElement('style');
            style.id = 'spinAnimation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const img = document.createElement('img');
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            display: none;
        `;
        
        // 先显示缩略图作为占位符
        if (thumbnailDataUrl) {
            img.src = thumbnailDataUrl;
            img.style.display = 'block';
            img.style.filter = 'blur(2px)'; // 添加模糊效果表示正在加载
        }
        
        modal.appendChild(controlBar);
        modal.appendChild(loadingDiv);
        modal.appendChild(img);
        document.body.appendChild(modal);
        
        // 关闭函数
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        // 异步加载原始高质量图片
        try {
            if (slideId && this.storageManager) {
                const originalBlob = await this.storageManager.getSlideBlob(slideId);
                if (originalBlob) {
                    const originalUrl = URL.createObjectURL(originalBlob);
                    
                    // 预加载原始图片
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        // 替换为高质量图片
                        img.src = originalUrl;
                        img.style.filter = 'none'; // 移除模糊效果
                        loadingDiv.style.display = 'none'; // 隐藏加载指示器
                        
                        // 清理临时URL
                        URL.revokeObjectURL(originalUrl);
                    };
                    
                    tempImg.onerror = () => {
                        console.warn('Failed to load original image, using thumbnail');
                        img.style.filter = 'none'; // 移除模糊效果，继续显示缩略图
                        loadingDiv.style.display = 'none';
                    };
                    
                    tempImg.src = originalUrl;
                } else {
                    // 如果无法加载原始图片，继续显示缩略图
                    console.warn('Original image blob not found, using thumbnail');
                    img.style.filter = 'none';
                    loadingDiv.style.display = 'none';
                }
            } else {
                // 没有slideId或storageManager，直接显示缩略图
                img.style.filter = 'none';
                loadingDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading original image:', error);
            img.style.filter = 'none';
            loadingDiv.style.display = 'none';
        }
        
        // 点击关闭
        modal.addEventListener('click', (e) => {
            // 只有点击模态框背景时才关闭，不包括图片本身和控制栏
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // 防止图片点击事件冒泡
        img.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 防止控制栏点击事件冒泡
        controlBar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // ESC键关闭
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }
    
    /**
     * 查看幻灯片全屏（旧版本兼容）
     */
    async viewSlideFullscreenLegacy(slide) {
        return await this.viewSlideFullscreen(slide);
    }
    
    /**
     * 通过 slide ID 下载幻灯片（从数据库获取原始图片）
     */
    async downloadSlideById(slideId) {
        try {
            if (!this.storageManager || !slideId) {
                console.warn('Storage manager not available or invalid slide ID');
                return;
            }
            
            const originalBlob = await this.storageManager.getSlideBlob(slideId);
            if (originalBlob) {
                const url = URL.createObjectURL(originalBlob);
                const link = document.createElement('a');
                
                // 使用CST时区的时间戳命名
                const now = new Date();
                const cstTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
                const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
                const fileName = `slide_${timestamp}_CST.png`;
                link.download = fileName;
                link.href = url;
                
                // 触发下载
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // 清理URL
                URL.revokeObjectURL(url);
                
                console.log('Slide downloaded successfully');
            } else {
                console.error('Failed to load slide blob');
                alert('Download failed: Unable to get original image data');
            }
        } catch (error) {
            console.error('Error downloading slide:', error);
            alert('Download failed: ' + error.message);
        }
    }

    /**
     * 下载单张幻灯片
     */
    downloadSingleSlide(slideId) {
        const slide = this.capturedSlides.find(s => s.id.toString() === slideId);
        if (!slide) return;
        
        // 使用CST时区的时间戳命名
        const slideTime = new Date(slide.timestamp || Date.now());
        const cstTime = new Date(slideTime.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
        const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
        
        const link = document.createElement('a');
        link.download = `slide_${timestamp}_CST.png`;
        link.href = slide.dataUrl;
        link.click();
    }
    
    /**
     * 打包下载所有幻灯片
     */
    async downloadSlidesAsZip() {
        // 只使用数据库数据源，确保Safari兼容性
        if (!this.storageManager || !this.currentStreamId) {
            const noStorageText = window.i18n ? window.i18n.get('slide.error_no_storage') : 'Storage not available';
            this.showError(noStorageText);
            return;
        }

        try {
            console.log('Safari Debug: Starting download for streamId:', this.currentStreamId);
            
            // 检查数据库连接状态
            if (!this.storageManager.db) {
                console.error('Safari Debug: Database not initialized');
                throw new Error('Database not initialized');
            }
            
            // 🔑 关键修复：使用与slides.html相同的数据获取方式
            // 先获取幻灯片列表（只包含缩略图数据）
            const slideList = await this.storageManager.getSlidesForStream(this.currentStreamId);
            console.log('Safari Debug: Retrieved slide list:', slideList.length);
            
            if (slideList.length === 0) {
                const noSlidesText = window.i18n ? window.i18n.get('slide.error_no_slides') : 'No slides available for download';
                this.showError(noSlidesText);
                return;
            }
            
            const packingText = window.i18n ? window.i18n.get('slide.packing') : 'Packing slides...';
            this.updateStatus(packingText, 'text-info');
            
            const zip = new JSZip();
            
            // 🔑 关键修复：逐个获取blob数据，与slides.html保持一致
            for (let i = 0; i < slideList.length; i++) {
                const slide = slideList[i];
                console.log(`Safari Debug: Processing slide ${i+1}/${slideList.length}: ${slide.slideId}`);
                
                try {
                    // 逐个获取blob数据（短事务，Safari友好）
                    const blob = await this.storageManager.getSlideBlob(slide.slideId);
                    
                    if (blob && blob instanceof Blob && blob.size > 0) {
                        // 为每张幻灯片生成独立的时间戳
                        const slideTime = new Date(slide.capturedAt || Date.now());
                        const cstTime = new Date(slideTime.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
                        const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
                        const fileName = `slide_${timestamp}_CST.png`;
                        
                        // 添加到zip
                        zip.file(fileName, blob);
                        
                        console.log(`Safari Debug: Added slide ${i+1} to zip: ${fileName}, size: ${blob.size} bytes`);
                    } else {
                        console.warn(`Safari Debug: Slide ${i+1} has invalid blob:`, blob);
                    }
                } catch (slideError) {
                    console.error(`Safari Debug: Failed to get blob for slide ${i+1}:`, slideError);
                    // 继续处理其他幻灯片
                }
            }
            
            console.log('Safari Debug: Starting ZIP generation...');
            
            // 生成 ZIP 文件，使用与slides.html相同的设置
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            console.log('Safari Debug: ZIP generated, size:', zipBlob.size, 'bytes');
            
            // 使用与slides.html相同的下载方式
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            const now = new Date();
            const cstTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
            const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
            link.download = `slides_${timestamp}_CST.zip`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            console.log('Safari Debug: Download completed using slides.html method');
            
            const downloadCompleteText = window.i18n ? window.i18n.get('slide.download_complete') : 'Download complete!';
            this.updateStatus(downloadCompleteText, 'text-success');
            setTimeout(() => {
                const runningText = window.i18n ? window.i18n.get('slide.running') : 'Running...';
                this.updateStatus(runningText, 'text-primary');
            }, 3000);
            
        } catch (error) {
            console.error('Failed to download slides from storage:', error);
            const errorText = window.i18n ? window.i18n.get('slide.error_pack_failed') : 'Pack download failed';
            this.showError(errorText + ': ' + error.message);
        }
    }
    
    /**
     * 更新状态显示
     */
    updateStatus(text, statusType = '') {
        const statusElement = document.getElementById('extractionStatusText');
        const statusIndicator = document.getElementById('extractionStatus');
        
        if (statusElement) {
            statusElement.textContent = text;
        }
        
        if (statusIndicator) {
            // 移除所有状态类
            statusIndicator.classList.remove('running', 'error', 'verifying', 'stopped');
            // 添加新的状态类
            if (statusType) {
                statusIndicator.classList.add(statusType);
            }
        }
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        if (window.liveApp && window.liveApp.showError) {
            window.liveApp.showError(message);
        } else {
            alert(message);
        }
    }
}

// 移除自动创建全局实例，让LiveApp来管理
// const slideExtractor = new SlideExtractor();

// 确保类在全局作用域中可用
window.SlideExtractor = SlideExtractor;
