/**
 * 调试模式模块
 * 提供视频流测试功能
 */
class DebugMode {
    constructor(app) {
        this.app = app;
        this.isActive = false;
        this.debugVideoFile = null;
    }

    /**
     * 激活调试模式
     */
    activate() {
        if (this.isActive) return;

        this.isActive = true;
        this.showDebugPanel();
        this.showFilterBar();
        this.setupEventListeners();
        this.showDebugHint();
    }

    /**
     * 停用调试模式
     */
    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;
        this.hideDebugPanel();
        this.hideFilterBar();
        this.cleanup();
    }

    /**
     * 切换调试模式
     */
    toggle() {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    /**
     * 显示调试面板
     */
    showDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
        }
    }

    /**
     * 隐藏调试面板
     */
    hideDebugPanel() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = 'none';
        }
    }

    /**
     * 显示Filter Bar（调试模式专用）
     */
    showFilterBar() {
        const filterBar = document.getElementById('filterBar');
        if (filterBar) {
            filterBar.style.display = 'block';
        }
    }

    /**
     * 隐藏Filter Bar
     */
    hideFilterBar() {
        const filterBar = document.getElementById('filterBar');
        if (filterBar) {
            filterBar.style.display = 'none';
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 关闭调试面板
        const closeBtn = document.getElementById('closeDebugPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.deactivate());
        }

        // M3U8 URL 输入
        const m3u8Btn = document.getElementById('debugM3u8Btn');
        if (m3u8Btn) {
            m3u8Btn.addEventListener('click', () => this.testM3u8Stream());
        }

        // 本地视频文件输入
        const videoInput = document.getElementById('debugVideoInput');
        if (videoInput) {
            videoInput.addEventListener('change', (e) => this.handleVideoFileSelect(e));
        }

        const videoBtn = document.getElementById('debugVideoBtn');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => this.testLocalVideo());
        }
    }

    /**
     * 显示调试提示
     */
    showDebugHint() {
        let hint = document.getElementById('debugHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'debugHint';
            hint.className = 'debug-hint';
            hint.textContent = window.i18n ?
                window.i18n.get('debug.hint') :
                'Press Ctrl+Shift+D to toggle debug mode';
            document.body.appendChild(hint);
        }

        hint.classList.add('show');
        setTimeout(() => {
            hint.classList.remove('show');
        }, 3000);
    }

    /**
     * 测试M3U8流
     */
    testM3u8Stream() {
        const input = document.getElementById('debugM3u8Input');
        const url = input.value.trim();

        if (!url) {
            alert(window.i18n ?
                window.i18n.get('debug.error.empty_url') :
                'Please enter a valid URL');
            return;
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch (e) {
            alert(window.i18n ?
                window.i18n.get('debug.error.invalid_url') :
                'Please enter a valid URL');
            return;
        }

        // 检测是否为m3u8文件
        const isM3u8 = url.toLowerCase().includes('.m3u8') ||
                       url.toLowerCase().includes('m3u8');
        const streamTitle = isM3u8 ? 'M3U8 Debug Stream' : 'Video Debug Stream';

        // 创建模拟流数据并添加到流列表
        const mockStream = this.createMockStreamData(streamTitle, url, url);
        this.addDebugStream(mockStream);

        // 清空输入并隐藏调试面板
        input.value = '';
        this.deactivate();
    }

    /**
     * 创建模拟流数据（符合API格式）
     */
    createMockStreamData(title, cameraUrl, screenUrl) {
        const now = new Date();
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2小时后结束

        return {
            id: `debug_${Date.now()}`,
            live_id: `debug_${Date.now()}`,
            title: title,
            subtitle: 'Debug Mode Location',
            status: 1, // 1 = live
            schedule_started_at: now.toISOString(),
            schedule_ended_at: endTime.toISOString(),
            participant_count: 1,
            session: {
                professor: {
                    name: 'Debug User'
                },
                section_group_title: 'Debug Section'
            },
            // 使用原有API格式的字段名
            target: cameraUrl,        // 摄像头流
            target_vga: screenUrl,    // 屏幕流
            isDebug: true
        };
    }

    /**
     * 添加调试流到流列表
     */
    addDebugStream(streamData) {
        // 添加到streams数组的开头（显示在最前面）
        this.app.streams.unshift(streamData);

        // 重新渲染流卡片
        this.app.renderStreams();

        // 隐藏"无流"消息
        const noStreamsMsg = document.getElementById('noStreamsMessage');
        if (noStreamsMsg) {
            noStreamsMsg.style.display = 'none';
        }

        // 显示成功提示
        const message = window.i18n ?
            window.i18n.get('debug.success.stream_added', { title: streamData.title }) :
            `Debug stream "${streamData.title}" added successfully!`;

        this.showTemporaryMessage(message, 'success');
    }

    /**
     * 显示临时消息
     */
    showTemporaryMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `debug-message debug-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(messageEl)) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 清理事件监听器等资源
        this.debugVideoFile = null;
    }
}

// 导出到全局作用域
window.DebugMode = DebugMode;