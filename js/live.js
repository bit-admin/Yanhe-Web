/**
 * 直播页面应用程序
 * 处理视频播放和幻灯片提取
 */
class LiveApp {
    constructor() {
        this.currentStream = null;
        this.currentStreamType = 'camera'; // 'camera' or 'screen'
        this.videoPlayer = null;
        this.slideExtractor = null;
        
        // 不在构造函数中直接调用init，而是返回一个Promise
        // 实际的初始化将在外部调用
    }
    
    /**
     * 安全获取i18n翻译
     */
    getI18nText(key, params = {}) {
        if (window.i18n && window.i18n.isLoaded) {
            return window.i18n.get(key, params);
        }
        // 如果i18n未加载，返回key作为后备
        return key;
    }
    
    /**
     * 格式化URL，处理转义字符
     */
    formatUrl(url) {
        if (!url) return '';
        
        // 移除转义的斜杠
        let formattedUrl = url.replace(/\\\//g, '/');
        
        // 确保URL格式正确
        formattedUrl = formattedUrl.trim();
        
        // 验证URL格式
        try {
            new URL(formattedUrl);
            return formattedUrl;
        } catch (error) {
            console.warn('Invalid URL format:', formattedUrl, error);
            return url; // 如果格式化失败，返回原始URL
        }
    }
    
    /**
     * 格式化简洁时间 
     * @param {string} dateStr - 日期字符串
     * @param {string} startTimeStr - 开始时间字符串（用于比较日期）
     * @returns {string} 格式化后的时间字符串
     */
    formatShortTime(dateStr, startTimeStr = null) {
        if (!dateStr) return '';
        
        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            // 如果提供了开始时间且是同一天，只返回时间部分
            if (startTimeStr) {
                const startDate = new Date(startTimeStr);
                if (date.getFullYear() === startDate.getFullYear() &&
                    date.getMonth() === startDate.getMonth() &&
                    date.getDate() === startDate.getDate()) {
                    return `${hours}:${minutes}`;
                }
            }
            
            // 返回完整的短格式: 2025/8/5 09:55
            return `${year}/${month}/${day} ${hours}:${minutes}`;
        } catch (error) {
            console.warn('Invalid date format:', dateStr);
            return dateStr; // 如果解析失败，返回原始字符串
        }
    }
    
    /**
     * 初始化应用程序
     */
    async init() {
        // 等待i18n系统准备就绪
        if (window.i18n && !window.i18n.isLoaded) {
            await window.i18n.init();
        }
        
        this.initializeVideoPlayer();
        this.loadStreamInfo();
        this.setupEventListeners();
        await this.setupSlideExtractor();
        
        // 检查是否有未完成的会话
        await this.checkUnfinishedSession();
        
        this.loadTermsContent();
    }
    
    /**
     * 从 URL 参数或 sessionStorage 加载直播流信息
     */
    loadStreamInfo() {
        const urlParams = new URLSearchParams(window.location.search);
        const streamId = urlParams.get('streamId');
        
        if (streamId) {
            // 验证校验和
            const timestamp = urlParams.get('timestamp');
            const checksum = urlParams.get('checksum');
            
            if (this.verifyChecksum(streamId, checksum)) {
                // 从 localStorage 恢复直播信息
                const cachedStream = localStorage.getItem(`stream_${streamId}`);
                if (cachedStream) {
                    try {
                        this.currentStream = JSON.parse(cachedStream);
                        this.renderStreamInfo();
                        this.setupStreamUrls();
                        return;
                    } catch (error) {
                        console.error('Failed to parse cached stream data:', error);
                    }
                }
                
                // 如果缓存丢失，尝试重新获取
                this.fetchStreamInfo(streamId);
                return;
            }
        }
        
        // 后备方案：检查 sessionStorage
        this.loadStreamInfoFromSession();
    }
    
    /**
     * 验证校验和
     */
    verifyChecksum(streamId, checksum) {
        if (!checksum) return false;
        
        // 使用相同的哈希算法验证
        let hash = 0;
        const str = streamId + 'ruc-learn-secret';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const expectedChecksum = Math.abs(hash).toString(36);
        
        return checksum === expectedChecksum;
    }
    
    /**
     * 从 sessionStorage 加载直播流信息（后备方案）
     */
    loadStreamInfoFromSession() {
        const streamData = sessionStorage.getItem('currentStream');
        if (!streamData) {
            this.showError(this.getI18nText('live.no_stream_data'));
            return;
        }
        
        try {
            this.currentStream = JSON.parse(streamData);
            this.renderStreamInfo();
            this.setupStreamUrls();
        } catch (error) {
            console.error('Failed to parse stream data:', error);
            this.showError(this.getI18nText('live.invalid_stream_data'));
        }
    }
    
    /**
     * 重新获取直播流信息
     */
    async fetchStreamInfo(streamId) {
        try {
            // 这里可以调用 API 重新获取直播信息
            // 暂时显示错误，因为我们没有直接获取单个直播信息的 API
            this.showError(this.getI18nText('live.stream_not_found'));
        } catch (error) {
            console.error('Failed to fetch stream info:', error);
            this.showError(this.getI18nText('live.fetch_failed'));
        }
    }
    
    /**
     * 渲染直播流信息
     */
    renderStreamInfo() {
        if (!this.currentStream) return;
        
        const container = document.getElementById('streamInfoCard');
        
        // 状态映射
        const statusMap = {
            0: { class: 'ended', text: this.getI18nText('streams.status.ended') },
            1: { class: 'live', text: this.getI18nText('streams.status.live') },
            2: { class: 'upcoming', text: this.getI18nText('streams.status.upcoming') }
        };
        
        const status = statusMap[this.currentStream.status] || statusMap[0];
        
        // 格式化时间为简洁格式
        const startTime = this.formatShortTime(this.currentStream.schedule_started_at);
        const endTime = this.formatShortTime(this.currentStream.schedule_ended_at, this.currentStream.schedule_started_at);
        
        // 格式化观看人数
        const participantCount = window.i18n ? window.i18n.formatNumber(this.currentStream.participant_count || 0) : (this.currentStream.participant_count || 0);
        
        container.innerHTML = `
            <div class="stream-status ${status.class}">${status.text}</div>
            <div class="stream-title">${this.escapeHtml(this.currentStream.title || 'Untitled')}</div>
            <div class="stream-meta">
                <div class="meta-item">
                    <span class="meta-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 11.5C16.11 11.5 17 12.39 17 13.5V16H15.5V22H9.5V16H8V13.5C8 12.39 8.89 11.5 10 11.5H15ZM5 6.5C5.8 6.5 6.5 7.2 6.5 8S5.8 9.5 5 9.5 3.5 8.8 3.5 8 4.2 6.5 5 6.5ZM7.5 11H9V10C9 9.45 8.55 9 8 9H6C5.45 9 5 9.45 5 10V12H6.5V22H10.5V18H7.5V11Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg></span>
                    <span>${this.escapeHtml(this.currentStream.session?.professor?.name || 'Unknown')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg></span>
                    <span>${this.escapeHtml(this.currentStream.subtitle || 'Unknown location')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg></span>
                    <span>${startTime} - ${endTime}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4C18.21 4 20 5.79 20 8C20 10.21 18.21 12 16 12C13.79 12 12 10.21 12 8C12 5.79 13.79 4 16 4ZM16 14C18.67 14 24 15.34 24 18V20H8V18C8 15.34 13.33 14 16 14ZM8.5 6C10.71 6 12.5 7.79 12.5 10C12.5 12.21 10.71 14 8.5 14C6.29 14 4.5 12.21 4.5 10C4.5 7.79 6.29 6 8.5 6ZM8.5 16C11.17 16 16.5 17.34 16.5 20V22H0.5V20C0.5 17.34 5.83 16 8.5 16Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg></span>
                    <span>${this.getI18nText('streams.participants', { count: participantCount })}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM5 19V5H19V19H5ZM7 7H9V9H7V7ZM11 7H17V9H11V7ZM7 11H9V13H7V11ZM11 11H17V13H11V11ZM7 15H9V17H7V15ZM11 15H17V17H11V15Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg></span>
                    <span>${this.escapeHtml(this.currentStream.session?.section_group_title || '')}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 设置直播流URL
     */
    setupStreamUrls() {
        if (!this.currentStream) return;
        
        const cameraUrl = this.formatUrl(this.currentStream.target || '');
        const screenUrl = this.formatUrl(this.currentStream.target_vga || '');
        
        document.getElementById('cameraUrl').value = cameraUrl;
        document.getElementById('screenUrl').value = screenUrl;
        
        // 默认加载摄像头流
        this.loadStream('camera');
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 流选择按钮
        document.getElementById('cameraStreamBtn').addEventListener('click', () => this.switchStream('camera'));
        document.getElementById('screenStreamBtn').addEventListener('click', () => this.switchStream('screen'));
        
        // 视频操作按钮
        document.getElementById('copyUrlBtn').addEventListener('click', () => this.copyCurrentStreamUrl());
        
        // 条款模态框事件
        document.getElementById('termsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTermsModal();
        });
        document.getElementById('closeTermsModal').addEventListener('click', () => this.hideTermsModal());
        
        // 语言变更事件监听
        window.addEventListener('languageChanged', () => {
            this.updateUI();
        });
        
        // 视频播放器事件
        this.setupVideoEvents();
        
        // 幻灯片设置按钮事件监听器（备份）
        this.setupSlideSettingsBackup();
    }
    
    /**
     * 设置视频播放器事件
     */
    setupVideoEvents() {
        if (!this.videoPlayer) {
            console.error('Video player not initialized');
            return;
        }
        
        this.videoPlayer.addEventListener('loadstart', () => {
            this.showVideoStatus(this.getI18nText('live.loading'));
        });
        
        this.videoPlayer.addEventListener('loadedmetadata', () => {
            // Video metadata loaded
        });
        
        this.videoPlayer.addEventListener('loadeddata', () => {
            this.hideVideoOverlay();
        });
        
        this.videoPlayer.addEventListener('canplay', () => {
            this.hideVideoOverlay();
        });
        
        this.videoPlayer.addEventListener('canplaythrough', () => {
            this.hideVideoOverlay();
        });
        
        this.videoPlayer.addEventListener('error', (e) => {
            console.error('Video error:', e);
            const error = this.videoPlayer.error;
            if (error) {
                console.error('Video error details:', {
                    code: error.code,
                    message: error.message,
                    MEDIA_ERR_ABORTED: error.MEDIA_ERR_ABORTED,
                    MEDIA_ERR_NETWORK: error.MEDIA_ERR_NETWORK,
                    MEDIA_ERR_DECODE: error.MEDIA_ERR_DECODE,
                    MEDIA_ERR_SRC_NOT_SUPPORTED: error.MEDIA_ERR_SRC_NOT_SUPPORTED
                });
            }
            this.showVideoStatus(this.getI18nText('live.video_error'));
        });
        
        this.videoPlayer.addEventListener('waiting', () => {
            this.showVideoStatus(this.getI18nText('live.buffering'));
        });
        
        this.videoPlayer.addEventListener('playing', () => {
            this.hideVideoOverlay();
        });
        
        // 定义 timeupdate 处理函数
        this.timeUpdateHandler = () => {
            // 当视频真正开始播放（时间更新）时，确保隐藏覆盖层
            if (this.videoPlayer.currentTime > 0) {
                this.hideVideoOverlay();
                // 移除这个事件监听器，避免重复调用
                this.videoPlayer.removeEventListener('timeupdate', this.timeUpdateHandler);
            }
        };
        
        this.videoPlayer.addEventListener('timeupdate', this.timeUpdateHandler);
        
        this.videoPlayer.addEventListener('pause', () => {
            // Video paused
        });
        
        this.videoPlayer.addEventListener('ended', () => {
            // Video ended
        });
    }
    
    /**
     * 初始化视频播放器
     */
    initializeVideoPlayer() {
        this.videoPlayer = document.getElementById('videoPlayer');
        
        if (!this.videoPlayer) {
            console.error('Video player element not found');
            return;
        }
        
        // 设置基本属性
        this.videoPlayer.playsInline = true;
        this.videoPlayer.muted = false; // 不要默认静音
        this.videoPlayer.preload = 'metadata';
        
        // 检查是否支持HLS
        if (this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // 原生支持HLS (Safari)
            this.hasNativeHLS = true;
        } else if (window.Hls && window.Hls.isSupported()) {
            // 使用HLS.js (其他浏览器)
            this.hasNativeHLS = false;
        } else {
            console.warn('HLS not supported');
            this.hasNativeHLS = false;
        }
    }
    
    /**
     * 切换直播流
     */
    switchStream(type) {
        if (type === this.currentStreamType) return;
        
        console.log('Switching stream to:', type);
        this.currentStreamType = type;
        this.updateStreamButtons();
        this.loadStream(type);
        
        // 显示/隐藏幻灯片提取功能
        const slideSection = document.getElementById('slideExtractionSection');
        if (type === 'screen') {
            console.log('Showing slide extraction section');
            slideSection.style.display = 'block';
            
            // 注意：不需要重复调用 initializeUI()，因为它已经在 SlideExtractor.init() 中调用过了
            // 重复调用会导致事件监听器被多次绑定
        } else {
            slideSection.style.display = 'none';
            // 如果正在提取幻灯片，停止提取
            if (this.slideExtractor && this.slideExtractor.isRunning) {
                this.slideExtractor.stopExtraction();
            }
        }
    }
    
    /**
     * 更新流选择按钮状态
     */
    updateStreamButtons() {
        const cameraBtn = document.getElementById('cameraStreamBtn');
        const screenBtn = document.getElementById('screenStreamBtn');
        
        if (this.currentStreamType === 'camera') {
            cameraBtn.className = 'btn btn-primary active';
            screenBtn.className = 'btn btn-secondary';
        } else {
            cameraBtn.className = 'btn btn-secondary';
            screenBtn.className = 'btn btn-primary active';
        }
    }
    
    /**
     * 加载直播流
     */
    loadStream(type) {
        if (!this.currentStream) {
            console.error('No current stream data');
            return;
        }
        
        if (!this.videoPlayer) {
            console.error('Video player not initialized');
            return;
        }
        
        const rawUrl = type === 'camera' ? this.currentStream.target : this.currentStream.target_vga;
        
        if (!rawUrl) {
            console.warn(`No ${type} stream URL available`);
            this.showVideoStatus(this.getI18nText('live.stream_not_available'));
            return;
        }
        
        const url = this.formatUrl(rawUrl);
        
        if (!url) {
            this.showVideoStatus(this.getI18nText('live.stream_not_available'));
            return;
        }
        
        this.showVideoStatus(this.getI18nText('live.loading'));
        
        try {
            // 清理之前的HLS实例
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }
            
            // 重置视频元素
            this.videoPlayer.pause();
            this.videoPlayer.removeAttribute('src');
            this.videoPlayer.load();
            
            if (this.hasNativeHLS && this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                // 原生HLS支持 (Safari)
                this.videoPlayer.src = url;
            } else if (window.Hls && window.Hls.isSupported()) {
                // 使用HLS.js
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 30,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    debug: false // 关闭调试信息
                });
                
                this.hls.loadSource(url);
                this.hls.attachMedia(this.videoPlayer);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // 当清单解析成功后，尝试播放
                    setTimeout(() => {
                        this.videoPlayer.play().catch(e => {
                            console.log('Autoplay prevented or failed:', e);
                            this.showVideoStatus(this.getI18nText('live.click_to_play'));
                        });
                    }, 100);
                });
                
                this.hls.on(Hls.Events.FRAG_BUFFERED, () => {
                    // 当有片段缓冲完成后，隐藏加载状态
                    if (this.videoPlayer.readyState >= 3) { // HAVE_FUTURE_DATA
                        this.hideVideoOverlay();
                    }
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', event, data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error('Fatal network error, trying to recover');
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.error('Fatal media error, trying to recover');
                                this.hls.recoverMediaError();
                                break;
                            default:
                                console.error('Fatal error, cannot recover');
                                this.showVideoStatus(this.getI18nText('live.stream_error'));
                                break;
                        }
                    }
                });
            } else {
                // 回退到直接设置src
                this.videoPlayer.src = url;
                
                // 对于直接设置src的情况，等待一小段时间后尝试播放
                setTimeout(() => {
                    this.videoPlayer.play().catch(e => {
                        console.log('Autoplay prevented or failed:', e);
                        this.showVideoStatus(this.getI18nText('live.click_to_play'));
                    });
                }, 500);
            }
            
        } catch (error) {
            console.error('Failed to load stream:', error);
            this.showVideoStatus(this.getI18nText('live.stream_error'));
        }
    }
    
    /**
     * 复制当前流URL
     */
    async copyCurrentStreamUrl() {
        const url = this.currentStreamType === 'camera' 
            ? document.getElementById('cameraUrl').value
            : document.getElementById('screenUrl').value;
            
        if (!url) {
            this.showError(this.getI18nText('live.no_url_to_copy'));
            return;
        }
        
        try {
            // 确保复制的URL是格式化后的
            const formattedUrl = this.formatUrl(url);
            await this.copyToClipboard(formattedUrl);
            this.showCopySuccess();
        } catch (error) {
            console.error('Failed to copy URL:', error);
            this.showError(this.getI18nText('live.copy_failed'));
        }
    }
    
    /**
     * 设置幻灯片提取器
     */
    async setupSlideExtractor() {
        // 检查所有必需的类是否存在
        if (!window.SlideExtractor) {
            console.error('SlideExtractor class not found');
            return;
        }
        
        if (!window.SlideStorageManager) {
            console.error('SlideStorageManager class not found');
            return;
        }
        
        if (!window.DeviceOptimizer) {
            console.error('DeviceOptimizer class not found');
            return;
        }
        
        // SlideExtractor已在slide-extractor.js中定义
        // 现在需要异步初始化以支持持久化存储
        this.slideExtractor = new SlideExtractor();
        try {
            await this.slideExtractor.init();
        } catch (error) {
            console.error('Failed to initialize SlideExtractor:', error);
            // 即使初始化失败，也保持slideExtractor可用
        }
    }
    
    /**
     * 设置幻灯片设置按钮的备份事件监听器
     */
    setupSlideSettingsBackup() {
        const settingsBtn = document.getElementById('slideSettingsBtn');
        const popup = document.getElementById('slideSettingsPopup');
        
        if (settingsBtn && popup) {
            // 移除可能存在的旧事件监听器
            settingsBtn.removeEventListener('click', this.handleSettingsClick);
            
            // 添加新的事件监听器
            this.handleSettingsClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (popup.classList.contains('show')) {
                    popup.classList.remove('show');
                } else {
                    popup.classList.add('show');
                }
            };
            
            settingsBtn.addEventListener('click', this.handleSettingsClick);
            
            // 添加点击空白处关闭弹窗的事件监听器
            this.handleDocumentClick = (e) => {
                // 检查点击的目标是否在设置按钮或弹窗内部
                if (!settingsBtn.contains(e.target) && !popup.contains(e.target)) {
                    popup.classList.remove('show');
                }
            };
            
            // 添加ESC键关闭弹窗的事件监听器
            this.handleKeyDown = (e) => {
                if (e.key === 'Escape' && popup.classList.contains('show')) {
                    popup.classList.remove('show');
                }
            };
            
            // 移除可能存在的旧事件监听器
            document.removeEventListener('click', this.handleDocumentClick);
            document.removeEventListener('keydown', this.handleKeyDown);
            // 添加新的事件监听器
            document.addEventListener('click', this.handleDocumentClick);
            document.addEventListener('keydown', this.handleKeyDown);
        }
    }
    
    /**
     * 检查是否有未完成的会话
     */
    async checkUnfinishedSession() {
        if (!this.slideExtractor || !this.slideExtractor.currentStreamId) return;
        
        try {
            const streamId = this.slideExtractor.currentStreamId;
            const slideCount = await this.slideExtractor.getSlideCountForCurrentStream();
            
            if (slideCount > 0) {
                // 显示恢复提示
                const shouldRestore = await this.showRestoreDialog(slideCount);
                if (shouldRestore) {
                    await this.restoreSlides(streamId);
                }
            }
        } catch (error) {
            console.error('Failed to check unfinished session:', error);
        }
    }
    
    /**
     * 显示恢复对话框
     */
    async showRestoreDialog(slideCount) {
        return new Promise((resolve) => {
            const modal = this.createRestoreModal(slideCount);
            document.body.appendChild(modal);
            
            modal.querySelector('.restore-btn').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };
            
            modal.querySelector('.discard-btn').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
            
            // 10秒后自动关闭，默认不恢复
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            }, 10000);
        });
    }
    
    /**
     * 创建恢复模态框
     */
    createRestoreModal(slideCount) {
        const modal = document.createElement('div');
        modal.className = 'modal restore-modal';
        modal.style.display = 'block';
        
        const title = this.getI18nText('session.restore_title');
        const message = this.getI18nText('session.restore_message').replace('{{count}}', `<strong style="color: #667eea;">${slideCount}</strong>`);
        const question = this.getI18nText('session.restore_question');
        const restoreBtn = this.getI18nText('session.restore_btn');
        const discardBtn = this.getI18nText('session.discard_btn');
        
        // 安全地构建提示文本
        const linkText = this.getI18nText('session.restore_tip_link_text');
        const tipTemplate = this.getI18nText('session.restore_tip');
        const slideManagerLink = `<a href="slides.html" style="color: #667eea; text-decoration: none;">${linkText}</a>`;
        const tip = tipTemplate.replace('{{slideManagerLink}}', slideManagerLink);
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; margin: 10% auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);">
                <div class="modal-header" style="border-bottom: 1px solid #e9ecef; padding: 1.5rem 1.5rem 1rem 1.5rem;">
                    <h3 style="margin: 0; color: #333; font-size: 1.25rem; font-weight: 600;">${this.escapeHtml(title)}</h3>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div style="text-align: center; margin: 1rem 0 1.5rem 0;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #667eea;">
                            <path d="M5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3ZM5 19H19V7H5V19Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M8 10H16" stroke="currentColor" stroke-width="2"/>
                            <path d="M8 14H13" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <p style="text-align: center; margin-bottom: 0.75rem; font-size: 1rem; line-height: 1.5;">${message}</p>
                    <p style="text-align: center; color: #666; margin-bottom: 1.5rem; font-size: 1rem;">${this.escapeHtml(question)}</p>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; font-size: 0.9rem; color: #666; line-height: 1.4;">
                        <strong>${this.currentLanguage === 'zh' ? '提示：' : 'Tip:'}</strong> ${tip}
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid #e9ecef; padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button class="btn btn-secondary discard-btn" style="min-width: 100px; padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #ddd; background: #f8f9fa; color: #6c757d; cursor: pointer; transition: all 0.2s;">${this.escapeHtml(discardBtn)}</button>
                    <button class="btn btn-primary restore-btn" style="min-width: 100px; padding: 0.5rem 1rem; border-radius: 6px; border: none; background: #667eea; color: white; cursor: pointer; transition: all 0.2s;">${this.escapeHtml(restoreBtn)}</button>
                </div>
            </div>
        `;
        
        // 添加悬停效果
        const restoreButton = modal.querySelector('.restore-btn');
        const discardButton = modal.querySelector('.discard-btn');
        
        restoreButton.addEventListener('mouseenter', () => {
            restoreButton.style.background = '#5a6fd8';
        });
        restoreButton.addEventListener('mouseleave', () => {
            restoreButton.style.background = '#667eea';
        });
        
        discardButton.addEventListener('mouseenter', () => {
            discardButton.style.background = '#e9ecef';
            discardButton.style.borderColor = '#c6c6c6';
        });
        discardButton.addEventListener('mouseleave', () => {
            discardButton.style.background = '#f8f9fa';
            discardButton.style.borderColor = '#ddd';
        });
        
        return modal;
    }
    
    /**
     * 恢复幻灯片
     */
    async restoreSlides(streamId) {
        try {
            // 委托给 SlideExtractor 处理
            await this.slideExtractor.restoreSlidesPreview();
            
            const slideCount = await this.slideExtractor.getSlideCountForCurrentStream();
            const successMessage = this.getI18nText('session.restore_success').replace('{{count}}', slideCount) || `Restored ${slideCount} slides`;
            this.showNotification(successMessage);
        } catch (error) {
            console.error('Failed to restore slides:', error);
            const errorMessage = this.getI18nText('session.restore_failed') || 'Failed to restore slides';
            this.showNotification(errorMessage, 'error');
        }
    }
    
    /**
     * 显示通知
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 0.9rem;
            line-height: 1.4;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 清理事件监听器
     */
    cleanup() {
        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
        }
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.handleSettingsClick) {
            const settingsBtn = document.getElementById('slideSettingsBtn');
            if (settingsBtn) {
                settingsBtn.removeEventListener('click', this.handleSettingsClick);
            }
        }
    }
    
    /**
     * 显示视频状态
     */
    showVideoStatus(message) {
        const overlay = document.getElementById('videoOverlay');
        const status = document.getElementById('videoStatus');
        
        status.textContent = message;
        overlay.classList.remove('hidden');
    }
    
    /**
     * 隐藏视频覆盖层
     */
    hideVideoOverlay() {
        const overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        } else {
            console.error('Video overlay element not found');
        }
    }
    
    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // 回退方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result ? Promise.resolve() : Promise.reject();
            } catch (error) {
                document.body.removeChild(textArea);
                return Promise.reject(error);
            }
        }
    }
    
    /**
     * 显示复制成功
     */
    showCopySuccess() {
        const btn = document.getElementById('copyUrlBtn');
        const originalText = btn.textContent;
        
        btn.classList.add('copied');
        btn.textContent = this.getI18nText('live.copied');
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = originalText;
        }, 2000);
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        // 创建错误消息元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message error-message-fixed';
        errorDiv.textContent = message;
        
        // 插入到body中，使用固定定位
        document.body.appendChild(errorDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    /**
     * 更新UI（语言变更时调用）
     */
    updateUI() {
        // 重新渲染流信息
        if (this.currentStream) {
            this.renderStreamInfo();
        }
        
        // 更新按钮状态
        this.updateStreamButtons();
    }
    
    /**
     * 加载条款内容
     */
    async loadTermsContent() {
        try {
            const response = await fetch('legal.md');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const content = await response.text();
            
            // 简单的Markdown到HTML转换
            const htmlContent = this.markdownToHtml(content);
            document.getElementById('termsContent').innerHTML = htmlContent;
        } catch (error) {
            console.error('Failed to load terms content:', error);
            document.getElementById('termsContent').innerHTML = '<p>Failed to load terms and conditions.</p>';
        }
    }
    
    /**
     * 简单的Markdown到HTML转换
     */
    markdownToHtml(markdown) {
        return markdown
            // 处理标题
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // 处理粗体文本
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // 处理段落 - 先将双换行符替换为段落分隔符
            .replace(/\n\n/g, '</p><p>')
            // 在开头添加开始段落标签，在结尾添加结束段落标签
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            // 处理单个换行符为<br> (使用更兼容的方式)
            .replace(/\n/g, '<br>')
            // 清理空段落和多余的br标签
            .replace(/<p><\/p>/g, '')
            .replace(/<br><\/p>/g, '</p>')
            .replace(/<p><br>/g, '<p>')
            .replace(/<h([1-6])><br>/g, '<h$1>')
            .replace(/<br><\/h([1-6])>/g, '</h$1>');
    }
    
    /**
     * 显示条款模态框
     */
    showTermsModal() {
        document.getElementById('termsModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 隐藏条款模态框
     */
    hideTermsModal() {
        document.getElementById('termsModal').style.display = 'none';
        document.body.style.overflow = '';
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

/**
 * 复制URL到剪贴板（全局函数，供HTML调用）
 */
async function copyToClipboard(inputId) {
    const input = document.getElementById(inputId);
    let url = input.value;
    
    if (!url) {
        return;
    }
    
    // 格式化URL，移除转义字符
    url = url.replace(/\\\//g, '/').trim();
    
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
        } else {
            // 回退方案 - 创建临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        // 显示复制成功反馈
        const button = input.nextElementSibling;
        const originalText = button.textContent;
        
        button.classList.add('copied');
        button.textContent = window.i18n && window.i18n.isLoaded ? 
            window.i18n.get('live.copied') : 'Copied!';
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy:', error);
    }
}

/**
 * 移动菜单切换
 */
function toggleMobileMenu() {
    console.log('Mobile menu toggle - to be implemented');
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 确保i18n系统已初始化
    if (window.i18n) {
        await window.i18n.init();
    }
    window.liveApp = new LiveApp();
    await window.liveApp.init();
});

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
    const modal = document.getElementById('termsModal');
    if (event.target === modal && window.liveApp) {
        window.liveApp.hideTermsModal();
    }
});

// 页面卸载时清理事件监听器
window.addEventListener('beforeunload', () => {
    if (window.liveApp) {
        window.liveApp.cleanup();
    }
});
