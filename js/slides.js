/**
 * 幻灯片管理应用程序
 * 用于管理和查看保存的幻灯片
 */
class SlidesManagementApp {
    constructor() {
        this.storageManager = null;
        this.currentStreams = [];
        this.currentStreamId = null;
        this.currentSlides = [];
        this.currentSlideIndex = 0;
    }

    /**
     * 初始化应用程序
     */
    async init() {
        try {
            // 初始化存储管理器
            this.storageManager = new SlideStorageManager();
            await this.storageManager.initDB();

            // 修复可能存在的数据一致性问题
            await this.storageManager.fixSlideCountInconsistency();

            // 设置事件监听器
            this.setupEventListeners();

            // 加载数据
            const loadingText = window.i18n ? window.i18n.get('slides.loading_initial') : 'Loading data...';
            this.showLoading(true, loadingText);

            try {
                await Promise.all([
                    this.loadStorageStats(),
                    this.loadStreams()
                ]);
            } finally {
                this.showLoading(false);
            }
        } catch (error) {
            console.error('Failed to initialize SlidesManagementApp:', error);
            const errorMessage = window.i18n ? window.i18n.get('slides.init_failed') : 'Initialization failed, please refresh the page and try again';
            this.showError(errorMessage);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 统计相关
        document.getElementById('refreshStatsBtn').addEventListener('click', () => this.refreshAllData());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllData());

        // 排序
        document.getElementById('sortBy').addEventListener('change', (e) => this.sortStreams(e.target.value));

        // 模态框
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('closeFullscreenBtn').addEventListener('click', () => this.closeFullscreen());

        // 全屏查看控制
        document.getElementById('prevSlideBtn').addEventListener('click', () => this.showPrevSlide());
        document.getElementById('nextSlideBtn').addEventListener('click', () => this.showNextSlide());
        document.getElementById('downloadSlideBtn').addEventListener('click', () => this.downloadCurrentSlide());

        // 批量操作
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAllSlides());
        document.getElementById('deleteStreamBtn').addEventListener('click', () => this.deleteCurrentStream());

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeFullscreen();
            }
        });

        // 点击模态框背景关闭
        document.getElementById('slideDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'slideDetailModal') {
                this.closeModal();
            }
        });

        document.getElementById('fullscreenModal').addEventListener('click', (e) => {
            if (e.target.id === 'fullscreenModal') {
                this.closeFullscreen();
            }
        });
    }

    /**
     * 刷新所有数据（统计和课程列表）
     */
    async refreshAllData() {
        try {
            const refreshingText = window.i18n ? window.i18n.get('slides.refreshing_all') : 'Refreshing all data...';
            this.showLoading(true, refreshingText);

            // 同时刷新统计数据和课程列表
            await Promise.all([
                this.loadStorageStats(),
                this.loadStreams()
            ]);

        } catch (error) {
            console.error('Failed to refresh data:', error);
            const errorMessage = window.i18n ? window.i18n.get('slides.refresh_failed') : 'Failed to refresh data';
            this.showError(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 加载存储统计
     */
    async loadStorageStats() {
        try {
            const stats = await this.storageManager.getStorageStats();

            document.getElementById('totalStreams').textContent = stats.totalStreams;
            document.getElementById('totalSlides').textContent = stats.totalSlides;
            document.getElementById('totalSize').textContent = stats.formattedSize;
        } catch (error) {
            console.error('Failed to load storage stats:', error);
            throw error; // 重新抛出错误，让调用者处理
        }
    }

    /**
     * 加载直播课程列表
     */
    async loadStreams() {
        try {
            console.log('Loading streams with slides...');
            this.currentStreams = await this.storageManager.getAllStreamsWithSlides();
            console.log('Loaded streams:', this.currentStreams.length, 'streams');

            this.renderStreams();
        } catch (error) {
            console.error('Failed to load streams:', error);

            // 降级处理：显示空数据状态
            this.currentStreams = [];
            this.renderStreams();
            throw error; // 重新抛出错误，让调用者处理
        }
    }

    /**
     * 渲染直播课程列表
     */
    renderStreams() {
        const container = document.getElementById('streamsGrid');
        const noDataMessage = document.getElementById('noDataMessage');
        
        container.innerHTML = '';

        if (this.currentStreams.length === 0) {
            container.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        noDataMessage.style.display = 'none';

        this.currentStreams.forEach(stream => {
            const card = this.createStreamCard(stream);
            container.appendChild(card);
        });
    }

    /**
     * 创建直播课程卡片
     */
    createStreamCard(stream) {
        const card = document.createElement('div');
        card.className = 'stream-card';
        
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        };

        const teacherLabel = window.i18n ? window.i18n.get('common.teacher') : 'Teacher';
        const locationLabel = window.i18n ? window.i18n.get('common.location') : 'Location';
        const timeLabel = window.i18n ? window.i18n.get('common.time') : 'Time';
        const periodLabel = window.i18n ? window.i18n.get('common.period') : 'Period';
        const slidesLabel = window.i18n ? window.i18n.get('common.slides_count') : 'slides';
        const lastAccessedLabel = window.i18n ? window.i18n.get('common.last_accessed') : 'Last accessed';
        const viewSlidesLabel = window.i18n ? window.i18n.get('common.view_slides') : 'View Slides';
        const deleteDataLabel = window.i18n ? window.i18n.get('common.delete_data') : 'Delete Data';
        const unknownLabel = window.i18n ? window.i18n.get('common.unknown') : 'Unknown';

        card.innerHTML = `
            <div class="stream-info">
                <h3>${this.escapeHtml(stream.title || unknownLabel)}</h3>
                <div class="stream-meta">
                    <div class="meta-item">
                        <span class="meta-label">${teacherLabel}：</span>
                        <span>${this.escapeHtml(stream.session?.professor?.name || unknownLabel)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${locationLabel}：</span>
                        <span>${this.escapeHtml(stream.subtitle || unknownLabel)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${timeLabel}：</span>
                        <span>${formatDate(stream.schedule_started_at)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">${periodLabel}：</span>
                        <span>${this.escapeHtml(stream.session?.section_group_title || unknownLabel)}</span>
                    </div>
                </div>
            </div>
            <div class="stream-stats">
                <div class="stat-badge">
                    <span class="stat-number">${stream.slideCount}</span>
                    <span class="stat-label">${slidesLabel}</span>
                </div>
                <div class="last-accessed">
                    ${lastAccessedLabel}：${formatDate(stream.lastAccessed)}
                </div>
            </div>
            <div class="stream-actions">
                <button class="btn btn-primary view-slides-btn" data-stream-id="${stream.id}">${viewSlidesLabel}</button>
                <button class="btn btn-danger delete-stream-btn" data-stream-id="${stream.id}">${deleteDataLabel}</button>
            </div>
        `;

        // 添加事件监听器
        card.querySelector('.view-slides-btn').addEventListener('click', () => this.viewStreamSlides(stream.id));
        card.querySelector('.delete-stream-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteStream(stream.id, stream.title);
        });

        return card;
    }

    /**
     * 查看直播课程的幻灯片
     */
    async viewStreamSlides(streamId) {
        try {
            const loadingText = window.i18n ? window.i18n.get('common.loading_slides') : 'Loading slides...';
            this.showLoading(true, loadingText);
            
            this.currentStreamId = streamId;
            this.currentSlides = await this.storageManager.getSlidesForStream(streamId);
            
            const stream = this.currentStreams.find(s => s.id === streamId);
            const modalTitle = window.i18n ? window.i18n.get('common.course_slides') : 'Course Slides';
            document.getElementById('modalStreamTitle').textContent = stream ? stream.title : modalTitle;

            const gallery = document.getElementById('slidesGallery');
            gallery.innerHTML = '';

            const slideAltText = window.i18n ? window.i18n.get('common.slide_alt') : 'Slide';
            this.currentSlides.forEach((slide, index) => {
                const slideEl = document.createElement('div');
                slideEl.className = 'slide-thumb';
                slideEl.innerHTML = `
                    <img src="${slide.dataUrl}" alt="${slideAltText} ${index + 1}">
                    <div class="slide-index">${index + 1}</div>
                `;
                
                slideEl.addEventListener('click', () => this.showSlideFullscreen(index));
                gallery.appendChild(slideEl);
            });

            this.showModal('slideDetailModal');
        } catch (error) {
            console.error('Failed to load slides for stream:', error);
            const errorMessage = window.i18n ? window.i18n.get('common.load_slides_failed') : 'Failed to load slides';
            this.showError(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 全屏显示幻灯片
     */
    async showSlideFullscreen(index) {
        this.currentSlideIndex = index;
        const slide = this.currentSlides[index];
        
        const fullscreenImg = document.getElementById('fullscreenImage');
        
        // 先显示缩略图作为占位符
        fullscreenImg.src = slide.dataUrl;
        fullscreenImg.style.filter = 'blur(2px)'; // 添加模糊效果表示正在加载
        fullscreenImg.style.opacity = '0.7';
        
        document.getElementById('slidePosition').textContent = `${index + 1} / ${this.currentSlides.length}`;
        
        // 更新导航按钮状态
        document.getElementById('prevSlideBtn').disabled = index === 0;
        document.getElementById('nextSlideBtn').disabled = index === this.currentSlides.length - 1;
        
        this.showModal('fullscreenModal');
        
        // 异步加载原始高质量图片
        try {
            const originalBlob = await this.storageManager.getSlideBlob(slide.slideId);
            if (originalBlob) {
                const originalUrl = URL.createObjectURL(originalBlob);
                
                // 预加载原始图片
                const tempImg = new Image();
                tempImg.onload = () => {
                    // 替换为高质量图片
                    fullscreenImg.src = originalUrl;
                    fullscreenImg.style.filter = 'none';
                    fullscreenImg.style.opacity = '1';
                    
                    // 清理临时URL
                    URL.revokeObjectURL(originalUrl);
                };
                
                tempImg.onerror = () => {
                    console.warn('Failed to load original image, using thumbnail');
                    fullscreenImg.style.filter = 'none';
                    fullscreenImg.style.opacity = '1';
                };
                
                tempImg.src = originalUrl;
            } else {
                // 如果无法加载原始图片，继续显示缩略图
                console.warn('Original image blob not found, using thumbnail');
                fullscreenImg.style.filter = 'none';
                fullscreenImg.style.opacity = '1';
            }
        } catch (error) {
            console.error('Error loading original image:', error);
            fullscreenImg.style.filter = 'none';
            fullscreenImg.style.opacity = '1';
        }
    }

    /**
     * 显示上一张幻灯片
     */
    showPrevSlide() {
        if (this.currentSlideIndex > 0) {
            this.showSlideFullscreen(this.currentSlideIndex - 1);
        }
    }

    /**
     * 显示下一张幻灯片
     */
    showNextSlide() {
        if (this.currentSlideIndex < this.currentSlides.length - 1) {
            this.showSlideFullscreen(this.currentSlideIndex + 1);
        }
    }

    /**
     * 下载当前幻灯片
     */
    async downloadCurrentSlide() {
        try {
            const slide = this.currentSlides[this.currentSlideIndex];
            const blob = await this.storageManager.getSlideBlob(slide.slideId);
            
            if (blob) {
                // 使用CST时区的时间戳命名
                const slideTime = new Date(slide.capturedAt || Date.now());
                const cstTime = new Date(slideTime.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
                const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `slide_${timestamp}_CST.png`;
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download slide:', error);
            this.showError('下载失败');
        }
    }

    /**
     * 下载所有幻灯片
     */
    async downloadAllSlides() {
        if (this.currentSlides.length === 0) {
            const noSlidesMessage = window.i18n ? window.i18n.get('common.no_slides_download') : 'No slides available for download';
            this.showError(noSlidesMessage);
            return;
        }

        try {
            const packingMessage = window.i18n ? window.i18n.get('common.packing_download') : 'Packing for download...';
            this.showLoading(true, packingMessage);
            
            // 使用JSZip打包所有幻灯片
            const zip = new JSZip();
            const stream = this.currentStreams.find(s => s.id === this.currentStreamId);
            const folderName = this.sanitizeFileName(stream?.title || 'slides');
            
            for (let i = 0; i < this.currentSlides.length; i++) {
                const slide = this.currentSlides[i];
                const blob = await this.storageManager.getSlideBlob(slide.slideId);
                if (blob) {
                    // 使用CST时区的时间戳命名
                    const slideTime = new Date(slide.capturedAt || Date.now());
                    const cstTime = new Date(slideTime.getTime() + (8 * 60 * 60 * 1000)); // 转换为CST (UTC+8)
                    const timestamp = cstTime.toISOString().slice(0, 19).replace(/:/g, '-');
                    const fileName = `slide_${timestamp}_CST.png`;
                    zip.file(`${folderName}/${fileName}`, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${folderName}_slides.zip`;
            link.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Failed to download all slides:', error);
            const errorMessage = window.i18n ? window.i18n.get('common.pack_download_failed') : 'Pack download failed';
            this.showError(errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 删除直播课程数据
     */
    async deleteStream(streamId, streamTitle) {
        const stream = this.currentStreams.find(s => s.id === streamId);
        const slideCount = stream ? stream.slideCount : 0;
        
        const confirmMessage = window.i18n 
            ? window.i18n.get('common.confirm_delete_course', { count: slideCount, title: streamTitle })
            : `Are you sure you want to delete all ${slideCount} slides for "${streamTitle}"?\n\nThis action cannot be undone!`;
        
        if (confirm(confirmMessage)) {
            try {
                const deletingMessage = window.i18n ? window.i18n.get('common.deleting_data') : 'Deleting data...';
                this.showLoading(true, deletingMessage);
                await this.storageManager.deleteStreamData(streamId);
                
                // 刷新列表
                await this.loadStreams();
                await this.loadStorageStats();
                
                const successMessage = window.i18n ? window.i18n.get('common.delete_success') : 'Deleted successfully';
                this.showSuccess(successMessage);
            } catch (error) {
                console.error('Failed to delete stream data:', error);
                const errorMessage = window.i18n ? window.i18n.get('common.delete_failed') : 'Delete failed';
                this.showError(errorMessage);
            } finally {
                this.showLoading(false);
            }
        }
    }

    /**
     * 删除当前查看的直播课程数据
     */
    async deleteCurrentStream() {
        if (!this.currentStreamId) return;
        
        const stream = this.currentStreams.find(s => s.id === this.currentStreamId);
        if (stream) {
            await this.deleteStream(this.currentStreamId, stream.title);
            this.closeModal();
        }
    }

    /**
     * 清空所有数据
     */
    async clearAllData() {
        const stats = await this.storageManager.getStorageStats();
        
        if (stats.totalSlides === 0) {
            const errorMessage = window.i18n ? window.i18n.get('slides.no_data_to_clear') : 'No data to clear';
            this.showError(errorMessage);
            return;
        }
        
        const confirmMessage = window.i18n ? 
            window.i18n.get('slides.confirm_clear_all', { 
                totalStreams: stats.totalStreams,
                totalSlides: stats.totalSlides, 
                totalSize: stats.formattedSize 
            }) :
            `Are you sure you want to clear all data?\n\nThis will delete ${stats.totalSlides} slides from ${stats.totalStreams} courses\nStorage used: ${stats.formattedSize}\n\nThis action cannot be undone!`;
        
        if (confirm(confirmMessage)) {
            try {
                const clearingText = window.i18n ? window.i18n.get('slides.clearing_data') : 'Clearing all data...';
                this.showLoading(true, clearingText);
                
                // 使用新的clearAllData方法
                await this.storageManager.clearAllData();
                
                // 刷新显示
                await this.loadStreams();
                await this.loadStorageStats();
                
                const successMessage = window.i18n ? window.i18n.get('slides.all_data_cleared') : 'All data has been cleared';
                this.showSuccess(successMessage);
            } catch (error) {
                console.error('Failed to clear all data:', error);
                const errorMessage = window.i18n ? window.i18n.get('slides.clear_failed') : 'Failed to clear data';
                this.showError(errorMessage);
            } finally {
                this.showLoading(false);
            }
        }
    }

    /**
     * 显示调试信息
     */
    /**
     * 排序直播课程
     */
    sortStreams(sortBy) {
        if (this.currentStreams.length === 0) return;
        
        this.currentStreams.sort((a, b) => {
            switch (sortBy) {
                case 'lastAccessed':
                    return new Date(b.lastAccessed) - new Date(a.lastAccessed);
                case 'schedule_started_at':
                    return new Date(b.schedule_started_at) - new Date(a.schedule_started_at);
                case 'slideCount':
                    return b.slideCount - a.slideCount;
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                default:
                    return 0;
            }
        });
        
        this.renderStreams();
    }

    /**
     * 显示模态框
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('slideDetailModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    /**
     * 关闭全屏模态框
     */
    closeFullscreen() {
        const modal = document.getElementById('fullscreenModal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    /**
     * 显示加载状态
     */
    showLoading(show, message = '正在加载...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');
        
        if (show) {
            messageEl.textContent = message;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        const errorPrefix = window.i18n ? window.i18n.get('common.error') : 'Error';
        alert(errorPrefix + ': ' + message);
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        const successPrefix = window.i18n ? window.i18n.get('common.success') : 'Success';
        alert(successPrefix + ': ' + message);
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 清理文件名
     */
    sanitizeFileName(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    }
}
