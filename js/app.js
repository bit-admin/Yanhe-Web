/**
 * 主应用程序
 * 处理页面交互和业务逻辑
 */
class App {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentStreamType = null;
        this.streams = [];
        this.currentSearchKeyword = null;
        this.isSearchMode = false;

        // Debug mode instance (lazy loaded)
        this.debugMode = null;

        this.init();
    }
    
    /**
     * 初始化应用程序
     */
    init() {
        this.setupEventListeners();
        this.loadSavedToken();
        this.setupInstructions();
        this.loadTermsContent();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // Token相关事件
        document.getElementById('saveTokenBtn').addEventListener('click', () => this.saveToken());
        document.getElementById('clearTokenBtn').addEventListener('click', () => this.clearToken());
        document.getElementById('toggleTokenVisibility').addEventListener('click', () => this.toggleTokenVisibility());
        
        // 登录相关事件
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('closeLoginModal').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('cancelLoginBtn').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // 直播流按钮事件
        document.getElementById('getPersonalStreamsBtn').addEventListener('click', () => this.loadStreams('personal'));
        document.getElementById('getPublicStreamsBtn').addEventListener('click', () => this.loadStreams('public'));

        // 搜索事件
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('keywordSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 搜索输入框失去焦点时也触发搜索（如果有内容）
        document.getElementById('keywordSearchInput').addEventListener('blur', (e) => {
            const keyword = e.target.value.trim();
            if (keyword && keyword !== this.currentSearchKeyword) {
                this.performSearch();
            } else if (!keyword && this.isSearchMode) {
                // 如果输入框为空且当前处于搜索模式，清除搜索状态
                this.clearSearch();
            }
        });

        // 监听输入变化，实现实时搜索清除
        document.getElementById('keywordSearchInput').addEventListener('input', (e) => {
            const keyword = e.target.value.trim();
            if (!keyword && this.isSearchMode) {
                // 如果输入框被清空且当前处于搜索模式，清除搜索状态
                this.clearSearch();
            }
        });

        // 分页事件
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());

        // 筛选事件
        document.getElementById('enableFilterCheckbox').addEventListener('change', () => this.toggleFilterControls());
        
        // 说明书事件
        document.getElementById('toggleInstructions').addEventListener('click', () => this.toggleInstructions());
        
        // 条款模态框事件
        document.getElementById('termsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTermsModal();
        });
        document.getElementById('closeTermsModal').addEventListener('click', () => this.hideTermsModal());
        
        // Token输入框回车事件
        document.getElementById('tokenInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveToken();
            }
        });
        
        // 语言变更事件监听
        window.addEventListener('languageChanged', () => {
            this.updateUI();
        });
        
        // 点击模态框背景关闭模态框
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('loginModal')) {
                this.hideLoginModal();
            }
        });
        document.getElementById('termsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('termsModal')) {
                this.hideTermsModal();
            }
        });

        // Debug mode keyboard shortcut (Ctrl+Shift+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleDebugMode();
            }
        });
    }
    
    /**
     * 加载保存的Token
     */
    loadSavedToken() {
        // 首先检查URL参数中是否有token
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
            // 如果URL中有token，使用它并覆盖本地存储的token
            
            // 设置新token到输入框
            document.getElementById('tokenInput').value = urlToken;
            
            // 覆盖保存新token到本地存储
            TokenManager.saveToken(urlToken);
            
            // 验证新token
            this.verifyToken();
            
            // 清除URL中的token参数以保护隐私
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            
            // 延迟显示成功消息，确保国际化系统已加载
            setTimeout(() => {
                this.showTokenStatus('success', window.i18n ? window.i18n.get('token.auto_filled') : 'Token已自动填入！');
            }, 100);
            
            return;
        }
        
        // 如果URL中没有token，检查本地存储
        const token = TokenManager.getToken();
        if (token) {
            document.getElementById('tokenInput').value = token;
            this.verifyToken();
        }
    }
    
    /**
     * 设置说明书展开/折叠
     */
    setupInstructions() {
        // 检查是否是首次访问
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            // 首次访问，展开说明书
            this.showInstructions();
            localStorage.setItem('hasVisited', 'true');
        }
    }
    
    /**
     * 保存Token
     */
    async saveToken() {
        const tokenInput = document.getElementById('tokenInput');
        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showTokenStatus('error', window.i18n.get('token.error'));
            return;
        }
        
        TokenManager.saveToken(token);
        this.showTokenStatus('success', window.i18n.get('token.saved'));
        
        // 验证Token
        await this.verifyToken();
    }
    
    /**
     * 清除Token
     */
    clearToken() {
        TokenManager.clearToken();
        document.getElementById('tokenInput').value = '';
        this.showTokenStatus('success', window.i18n.get('token.cleared'));
        this.clearStreams();
    }
    
    /**
     * 切换Token可见性
     */
    toggleTokenVisibility() {
        const tokenInput = document.getElementById('tokenInput');
        const toggleBtn = document.getElementById('toggleTokenVisibility');
        
        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else {
            tokenInput.type = 'password';
            toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.45703 12C3.73128 7.94291 7.52159 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C20.2672 16.0571 16.4769 19 11.9992 19C7.52159 19 3.73128 16.0571 2.45703 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.9992 15C13.6561 15 14.9992 13.6569 14.9992 12C14.9992 10.3431 13.6561 9 11.9992 9C10.342 9 8.99902 10.3431 8.99902 12C8.99902 13.6569 10.342 15 11.9992 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
    }
    
    /**
     * 验证Token
     */
    async verifyToken() {
        const token = TokenManager.getToken();
        if (!token) return;
        
        this.showTokenStatus('info', window.i18n.get('token.verifying'));
        
        try {
            const isValid = await API.verifyToken(token);
            if (isValid) {
                this.showTokenStatus('success', window.i18n.get('token.valid'));
            } else {
                this.showTokenStatus('error', window.i18n.get('token.invalid'));
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.showTokenStatus('error', window.i18n.get('error.network'));
        }
    }
    
    /**
     * 显示Token状态
     */
    showTokenStatus(type, message) {
        const statusElement = document.getElementById('tokenStatus');
        statusElement.className = `token-status ${type}`;
        statusElement.textContent = message;
        
        // 3秒后清除状态
        setTimeout(() => {
            statusElement.className = 'token-status';
            statusElement.textContent = '';
        }, 3000);
    }
    
    /**
     * 加载直播流
     */
    async loadStreams(type, page = 1) {
        if (!TokenManager.hasToken()) {
            this.showTokenStatus('error', window.i18n.get('error.token_required'));
            return;
        }

        // 退出搜索模式
        this.isSearchMode = false;
        this.currentSearchKeyword = null;

        this.currentStreamType = type;
        this.currentPage = page;

        this.showLoading(true);
        this.clearStreams();

        try {
            const isFilterEnabled = document.getElementById('enableFilterCheckbox').checked;

            if (isFilterEnabled) {
                // 筛选模式：加载多页数据并筛选
                await this.loadFilteredStreams(type);
            } else {
                // 正常模式：按原来的分页逻辑加载
                let response;
                if (type === 'personal') {
                    response = await API.getPersonalLiveList(page);
                } else {
                    response = await API.getPublicLiveList(page);
                }

                this.streams = response.data || [];
                this.totalPages = response.last_page || 1;
                this.currentPage = response.current_page || 1;
            }

            this.renderStreams();
            this.updatePagination();

            if (this.streams.length === 0) {
                this.showNoStreamsMessage();
            }

        } catch (error) {
            console.error('Failed to load streams:', error);
            this.showError(error.message || window.i18n.get('error.general'));
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 加载筛选后的直播流
     */
    async loadFilteredStreams(type) {
        const titleFilter = document.getElementById('titleFilterInput').value.trim().toLowerCase();
        const searchRange = parseInt(document.getElementById('searchRangeSelect').value) || 16;
        const pageSize = 16;
        const totalPages = Math.ceil(searchRange / pageSize);

        if (!titleFilter) {
            this.showTokenStatus('error', window.i18n.get('filter.error.empty_title'));
            return;
        }

        let allStreams = [];

        // 加载指定范围内的所有数据
        for (let page = 1; page <= totalPages; page++) {
            try {
                let response;
                if (type === 'personal') {
                    response = await API.getPersonalLiveList(page, pageSize);
                } else {
                    response = await API.getPublicLiveList(page, pageSize);
                }

                const streams = response.data || [];
                allStreams.push(...streams);

                // 如果已经达到指定数量或者是最后一页，停止加载
                if (allStreams.length >= searchRange || page >= (response.last_page || 1)) {
                    break;
                }
            } catch (error) {
                console.error(`Failed to load page ${page}:`, error);
                break;
            }
        }

        // 限制到指定数量
        allStreams = allStreams.slice(0, searchRange);

        // 根据标题筛选
        this.streams = allStreams.filter(stream => {
            const title = (stream.title || '').toLowerCase();
            return title.includes(titleFilter);
        });

        // 筛选模式下不使用分页
        this.totalPages = 1;
        this.currentPage = 1;
    }

    /**
     * 执行搜索
     */
    async performSearch(page = 1) {
        const keyword = document.getElementById('keywordSearchInput').value.trim();

        if (!keyword) {
            this.showTokenStatus('error', window.i18n.get('search.error.empty_keyword') || '请输入搜索关键词');
            return;
        }

        if (!TokenManager.hasToken()) {
            this.showTokenStatus('error', window.i18n.get('error.token_required'));
            return;
        }

        this.isSearchMode = true;
        this.currentSearchKeyword = keyword;
        this.currentPage = page;

        this.showLoading(true);
        this.clearStreams();

        try {
            const response = await API.searchLiveList(keyword, page);

            this.streams = response.data || [];
            this.totalPages = response.last_page || 1;
            this.currentPage = response.current_page || 1;

            this.renderStreams();
            this.updatePagination();

            if (this.streams.length === 0) {
                this.showNoStreamsMessage();
            }

        } catch (error) {
            console.error('Failed to search streams:', error);
            this.showError(error.message || window.i18n.get('error.general'));
        } finally {
            this.showLoading(false);
        }
    }


    /**
     * 清除搜索
     */
    clearSearch() {
        document.getElementById('keywordSearchInput').value = '';
        this.isSearchMode = false;
        this.currentSearchKeyword = null;
        this.clearStreams();
    }

    /**
     * 渲染直播流列表
     */
    renderStreams() {
        const container = document.getElementById('streamsGrid');
        container.innerHTML = '';
        
        this.streams.forEach(stream => {
            const card = this.createStreamCard(stream);
            container.appendChild(card);
        });
    }
    
    /**
     * 创建直播流卡片
     */
    createStreamCard(stream) {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.addEventListener('click', () => this.openStream(stream));
        
        // 状态映射
        const statusMap = {
            0: { class: 'ended', text: window.i18n.get('streams.status.ended') },
            1: { class: 'live', text: window.i18n.get('streams.status.live') },
            2: { class: 'upcoming', text: window.i18n.get('streams.status.upcoming') }
        };
        
        const status = statusMap[stream.status] || statusMap[0];
        
        // 格式化时间
        const startTime = window.i18n.formatDate(stream.schedule_started_at, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const endTime = window.i18n.formatDate(stream.schedule_ended_at, {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 格式化观看人数
        const participantCount = window.i18n.formatNumber(stream.participant_count || 0);
        
        // 为调试流添加特殊标识
        const debugBadge = stream.isDebug ?
            `<div class="debug-badge">🔧 DEBUG</div>` : '';

        card.innerHTML = `
            <div class="stream-status ${status.class}">${status.text}</div>
            ${debugBadge}
            <div class="stream-title">${this.escapeHtml(stream.title || 'Untitled')}</div>
            <div class="stream-professor"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 11.5C16.11 11.5 17 12.39 17 13.5V16H15.5V22H9.5V16H8V13.5C8 12.39 8.89 11.5 10 11.5H15ZM5 6.5C5.8 6.5 6.5 7.2 6.5 8S5.8 9.5 5 9.5 3.5 8.8 3.5 8 4.2 6.5 5 6.5ZM7.5 11H9V10C9 9.45 8.55 9 8 9H6C5.45 9 5 9.45 5 10V12H6.5V22H10.5V18H7.5V11Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg> ${this.escapeHtml(stream.session?.professor?.name || 'Unknown')}</div>
            <div class="stream-location"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg> ${this.escapeHtml(stream.subtitle || 'Unknown location')}</div>
            <div class="stream-time"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg> ${startTime} - ${endTime}</div>
            <div class="stream-section">${this.escapeHtml(stream.session?.section_group_title || '')}</div>
            <div class="stream-participants"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4C18.21 4 20 5.79 20 8C20 10.21 18.21 12 16 12C13.79 12 12 10.21 12 8C12 5.79 13.79 4 16 4ZM16 14C18.67 14 24 15.34 24 18V20H8V18C8 15.34 13.33 14 16 14ZM8.5 6C10.71 6 12.5 7.79 12.5 10C12.5 12.21 10.71 14 8.5 14C6.29 14 4.5 12.21 4.5 10C4.5 7.79 6.29 6 8.5 6ZM8.5 16C11.17 16 16.5 17.34 16.5 20V22H0.5V20C0.5 17.34 5.83 16 8.5 16Z" stroke="currentColor" stroke-width="1" fill="currentColor"/></svg> ${window.i18n.get('streams.participants', { count: participantCount })}</div>
        `;
        
        return card;
    }
    
    /**
     * 打开直播流页面
     */
    openStream(stream) {
        // 将关键信息编码到 URL 中
        const streamId = stream.id || stream.live_id;
        const params = new URLSearchParams({
            streamId: streamId,
            // 可选：添加验证信息防止直接访问
            timestamp: Date.now(),
            checksum: this.generateChecksum(streamId)
        });
        
        // 将完整直播信息存储到 localStorage 作为缓存
        localStorage.setItem(`stream_${streamId}`, JSON.stringify(stream));
        
        // 跳转时携带参数
        window.location.href = `live.html?${params.toString()}`;
    }
    
    /**
     * 生成校验和（简单的校验机制）
     */
    generateChecksum(streamId) {
        // 简单的哈希函数
        let hash = 0;
        const str = streamId + 'ruc-learn-secret';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 更新分页控件
     */
    updatePagination() {
        const pagination = document.getElementById('pagination');
        const isFilterEnabled = document.getElementById('enableFilterCheckbox').checked;

        // Hide pagination when filtering is active since we show all filtered results
        if (isFilterEnabled) {
            pagination.style.display = 'none';
            return;
        }

        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');

        if (this.totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;

        pageInfo.textContent = window.i18n.get('pagination.page', {
            current: this.currentPage,
            total: this.totalPages
        });
    }
    
    /**
     * 上一页
     */
    previousPage() {
        if (this.currentPage > 1) {
            if (this.isSearchMode) {
                this.performSearch(this.currentPage - 1);
            } else {
                this.loadStreams(this.currentStreamType, this.currentPage - 1);
            }
        }
    }

    /**
     * 下一页
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            if (this.isSearchMode) {
                this.performSearch(this.currentPage + 1);
            } else {
                this.loadStreams(this.currentStreamType, this.currentPage + 1);
            }
        }
    }
    
    /**
     * 显示/隐藏加载指示器
     */
    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        loading.style.display = show ? 'block' : 'none';
    }
    
    /**
     * 清除直播流列表
     */
    clearStreams() {
        document.getElementById('streamsGrid').innerHTML = '';
        document.getElementById('pagination').style.display = 'none';
        document.getElementById('noStreamsMessage').style.display = 'none';
    }

    /**
     * 切换筛选控件的启用状态
     */
    toggleFilterControls() {
        const isEnabled = document.getElementById('enableFilterCheckbox').checked;
        const titleInput = document.getElementById('titleFilterInput');
        const rangeSelect = document.getElementById('searchRangeSelect');

        titleInput.disabled = !isEnabled;
        rangeSelect.disabled = !isEnabled;

        // 如果禁用筛选，清空输入框
        if (!isEnabled) {
            titleInput.value = '';
        }
    }
    
    /**
     * 显示无直播流消息
     */
    showNoStreamsMessage() {
        const noStreamsMessage = document.getElementById('noStreamsMessage');
        const titleElement = noStreamsMessage.querySelector('h3');
        const descElement = noStreamsMessage.querySelector('p');
        const isFilterEnabled = document.getElementById('enableFilterCheckbox').checked;

        if (this.isSearchMode) {
            titleElement.textContent = window.i18n.get('search.no_results.title') || 'No search results found';
            descElement.textContent = window.i18n.get('search.no_results.desc') || `No courses found for "${this.currentSearchKeyword}". Try different keywords.`;
        } else if (isFilterEnabled) {
            titleElement.textContent = window.i18n.get('filter.no_results.title');
            descElement.textContent = window.i18n.get('filter.no_results.desc');
        } else {
            titleElement.setAttribute('data-i18n', 'streams.no_streams.title');
            descElement.setAttribute('data-i18n', 'streams.no_streams.desc');
            titleElement.textContent = window.i18n ? window.i18n.get('streams.no_streams.title') : 'No streams found';
            descElement.textContent = window.i18n ? window.i18n.get('streams.no_streams.desc') : 'Please check your token and try again.';
        }

        noStreamsMessage.style.display = 'block';
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        // 可以在这里添加更复杂的错误显示逻辑
        this.showTokenStatus('error', message);
    }
    
    /**
     * 切换说明书显示
     */
    toggleInstructions() {
        const content = document.getElementById('instructionsContent');
        const isShown = content.classList.contains('show');
        
        if (isShown) {
            this.hideInstructions();
        } else {
            this.showInstructions();
        }
    }
    
    /**
     * 显示说明书
     */
    showInstructions() {
        const content = document.getElementById('instructionsContent');
        const button = document.getElementById('toggleInstructions');
        
        content.classList.add('show');
        button.classList.add('expanded');
        button.querySelector('span').textContent = window.i18n.get('instructions.toggle').replace('Show', 'Hide');
    }
    
    /**
     * 隐藏说明书
     */
    hideInstructions() {
        const content = document.getElementById('instructionsContent');
        const button = document.getElementById('toggleInstructions');
        
        content.classList.remove('show');
        button.classList.remove('expanded');
        button.querySelector('span').textContent = window.i18n.get('instructions.toggle');
    }
    
    /**
     * 加载条款内容
     */
    async loadTermsContent() {
        try {
            const response = await fetch('legal.md');
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
     * 更新UI（语言变更时调用）
     */
    updateUI() {
        // 重新渲染直播流（如果有的话）
        if (this.streams.length > 0) {
            this.renderStreams();
        }
        
        // 更新分页信息
        if (this.totalPages > 1) {
            this.updatePagination();
        }
        
        // 更新说明书按钮文本
        const button = document.getElementById('toggleInstructions');
        const content = document.getElementById('instructionsContent');
        const isShown = content.classList.contains('show');
        
        if (isShown) {
            button.querySelector('span').textContent = window.i18n.get('instructions.toggle').replace('Show', 'Hide');
        } else {
            button.querySelector('span').textContent = window.i18n.get('instructions.toggle');
        }
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
    
    /**
     * 显示登录模态框
     */
    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 清空表单
        document.getElementById('loginForm').reset();
        this.clearLoginStatus();
        
        // 聚焦到用户名输入框
        setTimeout(() => {
            document.getElementById('usernameInput').focus();
        }, 100);
    }
    
    /**
     * 隐藏登录模态框
     */
    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
        document.body.style.overflow = '';
        
        // 清空表单和状态
        document.getElementById('loginForm').reset();
        this.clearLoginStatus();
    }
    
    /**
     * 处理登录表单提交
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('usernameInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        
        if (!username || !password) {
            this.showLoginStatus('error', window.i18n ? window.i18n.get('login.error.empty_fields') : '请填写完整的学号和密码');
            return;
        }
        
        // 显示加载状态
        this.showLoginStatus('loading', window.i18n ? window.i18n.get('login.status.logging_in') : '正在登录...');
        this.setLoginButtonsDisabled(true);
        
        try {
            // 调用API进行登录
            const token = await API.loginWithCredentials(username, password);
            
            // 登录成功，保存Token
            TokenManager.saveToken(token);
            document.getElementById('tokenInput').value = token;
            
            // 显示成功状态
            this.showLoginStatus('success', window.i18n ? window.i18n.get('login.status.success') : '登录成功！Token已自动填入');
            
            // 延迟关闭模态框，然后验证Token
            setTimeout(() => {
                this.hideLoginModal();
                // 关闭模态框后验证Token并在主页面显示状态
                this.verifyToken();
            }, 1500);
            
        } catch (error) {
            // 显示错误状态
            this.showLoginStatus('error', error.message);
        } finally {
            this.setLoginButtonsDisabled(false);
        }
    }
    
    /**
     * 显示登录状态信息
     */
    showLoginStatus(type, message) {
        const statusElement = document.getElementById('loginStatus');
        statusElement.textContent = message;
        statusElement.className = `login-status ${type}`;
    }
    
    /**
     * 清空登录状态
     */
    clearLoginStatus() {
        const statusElement = document.getElementById('loginStatus');
        statusElement.textContent = '';
        statusElement.className = 'login-status';
    }
    
    /**
     * 设置登录按钮的禁用状态
     */
    setLoginButtonsDisabled(disabled) {
        document.getElementById('submitLoginBtn').disabled = disabled;
        document.getElementById('cancelLoginBtn').disabled = disabled;
        
        if (disabled) {
            document.getElementById('submitLoginBtn').textContent = window.i18n ? window.i18n.get('login.status.logging_in') : '登录中...';
        } else {
            document.getElementById('submitLoginBtn').textContent = window.i18n ? window.i18n.get('login.submit') : 'Login';
        }
    }

    /**
     * 切换调试模式
     */
    async toggleDebugMode() {
        // 如果调试模式未加载，先加载
        if (!this.debugMode) {
            await this.loadDebugMode();
        }

        // 切换调试模式
        if (this.debugMode) {
            this.debugMode.toggle();
        }
    }

    /**
     * 动态加载调试模式
     */
    async loadDebugMode() {
        try {
            // 动态加载调试模式脚本
            if (!window.DebugMode) {
                await this.loadScript('js/debug-mode.js');
            }

            // 创建调试模式实例
            if (window.DebugMode && !this.debugMode) {
                this.debugMode = new window.DebugMode(this);
            }
        } catch (error) {
            console.error('Failed to load debug mode:', error);
        }
    }

    /**
     * 动态加载脚本
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 确保i18n初始化完成
        if (window.i18n) {
            await window.i18n.init();
        } else {
            console.warn('i18n not available, creating fallback');
            // 创建一个简单的回退i18n对象
            window.i18n = {
                get: (key) => key,
                getCurrentLanguage: () => 'en',
                isLoaded: false
            };
        }
        
        // 初始化应用
        window.app = new App();
        
        // 强制重新翻译页面以确保移动端也能正确显示翻译
        if (window.i18n && window.i18n.isLoaded) {
            setTimeout(() => {
                window.i18n.translatePage();
            }, 100);
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // 即使出错也要创建app实例，确保基本功能可用
        window.app = new App();
    }
});

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
    const modal = document.getElementById('termsModal');
    if (event.target === modal && window.app) {
        window.app.hideTermsModal();
    }
});
