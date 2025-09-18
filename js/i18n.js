/**
 * 国际化 (i18n) 系统
 * 支持中英文切换
 */
class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = this.getEmbeddedTranslations();
        this.isLoaded = false;
        
        // 不要立即初始化，等待手动调用
    }
    
    /**
     * 检测用户语言
     */
    detectLanguage() {
        // 检查是否有保存的语言设置
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            return savedLang;
        }
        
        // 检测浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('zh') ? 'zh' : 'en';
    }
    
    /**
     * 初始化i18n系统
     */
    async init() {
        try {
            // 翻译内容已经内嵌，直接使用
            this.updateLanguageButtons();
            this.setupEventListeners();
            this.translatePage();
            this.isLoaded = true;
            
            // 更新页面标题
            document.title = this.get('site.title');
        } catch (error) {
            console.error('Failed to initialize i18n:', error);
            this.isLoaded = true;
        }
    }
    
    /**
     * 获取内嵌的翻译内容
     */
    getEmbeddedTranslations() {
        return {
            en: {
                "site.title": "RUC Portal - Access Yanhekt Resources",
                "nav.title": "Razzakov University College",
                "nav.subtitle": "Yanhekt Student Portal",
                "nav.back_home": "Home",
                "nav.home": "Home",
                "nav.slides": "View Saved Slides",
                "hero.title": "RUC Student Portal",
                "hero.subtitle": "Access live streams from Yanhekt and get real-time slides",
                "hero.motto": "By using our services, you agree to our terms and conditions.",
                "instructions.title": "How to Get Started",
                "instructions.toggle": "Show Instructions",
                "instructions.step1.title": "Get Your Token from Yanhekt",
                "instructions.step1.desc": "Your security is important to us. Option 1: Log in directly with your BIT SSO credentials. Option 2: To avoid entering your password, first log in at \"Yanhekt\", then use our bookmarklet to create an access key for this site. This step is only needed once while the key is active.",
                "instructions.bookmark.title": "Bookmark Tool",
                "instructions.bookmark.instruction": "Drag the button below to your bookmarks bar, then click it on the Yanhekt website:",
                "instructions.bookmark.button": "Get Yanhekt Token",
                "instructions.bookmark.note": "Tip: On iOS Safari, press and hold the \"Get Yanhekt Key\" button above, keep your finger pressed, and use your other hand to tap the \"book\" icon at the bottom of the screen. On the newly opened bookmarks bar page, drag and drop the button to your desired location; on desktop browsers, press Ctrl/Cmd+Shift+B to show the bookmarks bar.",
                "instructions.step2.title": "Enter Your Token",
                "instructions.step2.desc": "Paste the token you copied from Yanhekt into the input field below. We do not store your account, password, or access token on the server.",
                "instructions.step3.title": "Browse Live Streams",
                "instructions.step3.desc": "To view the courses you have registered for this semester, please check your personal live stream list; to view all live stream courses currently available across the school, please switch to the public live stream list. You can also enter keywords to search for courses that you want to watch.",
                "instructions.step4.title": "Enable automatic slide extraction",
                "instructions.step4.desc": "When choosing to watch a screen recording, you can enable the automatic slide extraction feature. When enabling this feature on a mobile device, keep the browser tab active and in the foreground. Tip: On iOS Safari, switching apps or locking the screen may interrupt slide extraction. You can enter fullscreen or picture-in-picture playback mode and turn off auto-lock.",
                "instructions.step5.title": "Manage Your Saved Slides",
                "instructions.step5.desc": "Slides will be saved in your browser's local database. Click \"View Saved Slides\" to manage them. Tip: If downloading fails on the live page, you can return here to view and download all saved slides; should an index error occur in the local database, you may attempt to rectify it by using the \"Clear All Data\" function.",
                "instructions.step6.title": "Download Recorded Videos",
                "instructions.step6.desc": "Want to download recorded course videos from Yanhekt? Use our Electron version downloader:",
                "token.title": "Access Token",
                "token.placeholder": "Enter your Yanhekt token...",
                "token.save": "Save Token",
                "token.clear": "Clear Token",
                "token.login": "Login with Account",
                "token.saved": "Token saved successfully!",
                "token.cleared": "Token cleared!",
                "token.error": "Please enter a valid token",
                "token.auto_filled": "Token automatically filled and saved!",
                "token.verifying": "Verifying token...",
                "token.valid": "Token is valid",
                "token.invalid": "Token is invalid",
                "login.title": "Login with Account",
                "login.username": "Student ID",
                "login.password": "Password",
                "login.username_placeholder": "Enter your student ID",
                "login.password_placeholder": "Enter your password",
                "login.submit": "Login",
                "login.cancel": "Cancel",
                "login.status.logging_in": "Logging in...",
                "login.status.success": "Login successful! Token has been automatically filled.",
                "login.error.empty_fields": "Please fill in both student ID and password",
                "streams.title": "Live Streams",
                "streams.personal": "Personal Streams",
                "streams.public": "Public Streams",
                "streams.no_streams.title": "No streams found",
                "streams.no_streams.desc": "Please check your token and try again.",
                "streams.status.live": "Live",
                "streams.status.upcoming": "Upcoming",
                "streams.status.ended": "Ended",
                "streams.participants": "{{count}} viewers",
                "streams.watch": "Watch Stream",
                "filter.enable": "Enable Filter",
                "filter.title_placeholder": "Enter course title to search...",
                "filter.no_results.title": "No matching streams found",
                "filter.no_results.desc": "No streams match your search criteria. Try adjusting your search terms or clear the filter to see all streams.",
                "filter.search_range.16": "Search in first 16",
                "filter.search_range.32": "Search in first 32",
                "filter.search_range.64": "Search in first 64",
                "filter.search_range.128": "Search in first 128",
                "filter.error.empty_title": "Please enter a course title to search",
                "search.keyword_placeholder": "Enter keyword to search...",
                "search.button": "Search",
                "search.error.empty_keyword": "Please enter a search keyword",
                "search.no_results.title": "No search results found",
                "search.no_results.desc": "No courses found for your search. Try different keywords.",
                "pagination.prev": "Previous",
                "pagination.next": "Next",
                "pagination.page": "Page {{current}} of {{total}}",
                "debug.title": "Debug Mode",
                "debug.close": "Close",
                "debug.m3u8.title": "M3U8 Stream URL",
                "debug.m3u8.desc": "Enter a direct m3u8 stream URL for testing",
                "debug.m3u8.placeholder": "https://example.com/stream.m3u8",
                "debug.m3u8.button": "Test M3U8",
                "debug.local.title": "Local Video File",
                "debug.local.desc": "Upload a local video file for testing",
                "debug.local.input": "Choose video file",
                "debug.local.button": "Test Video",
                "debug.hint": "Press Ctrl+Shift+D to toggle debug mode",
                "debug.error.empty_url": "Please enter a valid M3U8 URL",
                "debug.error.invalid_url": "Please enter a valid URL",
                "debug.success.stream_added": "Debug stream \"{{title}}\" added successfully!",
                "loading": "Loading...",
                "error.general": "An error occurred. Please try again.",
                "error.network": "Network error. Please check your connection.",
                "error.token_required": "Please enter your token first.",
                "footer.terms": "Terms and Conditions",
                "footer.yanhekt": "Visit Yanhekt",
                "footer.old_version": "Old Version",
                "footer.github": "GitHub",
                "footer.copyright": "© 2025 Razzakov University College. | Yanhekt™ is a trademark of its rights holder. | We respect the copyright and other intellectual property rights of third parties.",
                "terms.title": "TERMS AND CONDITIONS",
                "modal.close": "Close",
                "live.title": "Live Stream - RUC Portal",
                "live.camera_stream": "Camera Stream",
                "live.screen_stream": "Screen Stream",
                "live.copy_url": "Copy Stream URL",
                "live.fullscreen": "Fullscreen",
                "live.loading": "Loading...",
                "live.buffering": "Buffering...",
                "live.video_error": "Video playback error",
                "live.video_not_supported": "Your browser does not support the video tag.",
                "live.stream_not_available": "Stream not available",
                "live.stream_error": "Failed to load stream",
                "live.click_to_play": "Click to play",
                "live.no_stream_data": "No stream data found. Please go back to the home page.",
                "live.invalid_stream_data": "Invalid stream data.",
                "live.no_url_to_copy": "No URL to copy",
                "live.copy_failed": "Failed to copy URL",
                "live.copied": "Copied!",
                "live.stream_urls": "Stream URLs",
                "live.camera_url": "Camera Stream URL:",
                "live.screen_url": "Screen Stream URL:",
                "live.copy": "Copy",
                "slide.title": "Slide Extraction",
                "slide.enable": "Enable Auto Extraction",
                "slide.settings": "Settings",
                "slide.check_interval": "Check Interval (ms):",
                "slide.double_verification": "Enable Double Verification",
                "slide.verification_count": "Verification Count:",
                "slide.status_stopped": "Stopped",
                "slide.slides_captured": "Slides captured:",
                "slide.download": "Download Slides",
                "slide.clear": "Clear Slides",
                "slide.running": "Running...",
                "slide.stopped": "Stopped",
                "slide.verification_failed": "Verification failed, re-detecting...",
                "slide.verifying": "Verifying...",
                "slide.change_detected": "Change detected, starting verification...",
                "slide.packing": "Packing slides...",
                "slide.download_complete": "Download complete!",
                "slide.download_zip": "Download Slides ZIP",
                "slide.error_no_player": "Video player not found, please start playing video first",
                "slide.error_no_slides": "No slides available for download",
                "slide.error_pack_failed": "Pack download failed",
                "slide.confirm_clear": "Are you sure you want to clear all {{count}} slides?",
                "slide.no_slides_to_clear": "No slides to clear",
                "slide.confirm_delete_all": "Are you sure you want to delete all {{count}} slides from the current live stream? This action cannot be undone!\n\nThis will permanently delete the slide data stored in the database.",
                "slide.slides_deleted": "Slides deleted successfully",
                "slide.delete_failed": "Failed to delete slides",
                "slide.session_restore_title": "Previous session detected",
                "slide.session_restore_message": "Detected that you were extracting slides while watching this live stream last time. Do you want to continue extraction?\n{{count}} slides have been saved",
                "slides.title": "Slide Manager - RUC Portal",
                "slides.page_title": "Slide Manager",
                "slides.page_description": "Manage and view slides extracted from live courses",
                "slides.storage_stats": "Storage Statistics",
                "slides.total_streams": "Courses",
                "slides.total_slides": "Total Slides",
                "slides.total_size": "Storage Used",
                "slides.refresh": "Refresh Stats",
                "slides.clear_all": "Clear All Data",
                "slides.stream_list": "Courses with Saved Slides",
                "slides.sort.recent": "Recently Accessed",
                "slides.sort.date": "Class Time",
                "slides.sort.slides": "Slide Count",
                "slides.sort.title": "Course Name",
                "slides.no_data.title": "No Data",
                "slides.no_data.desc": "No slides have been saved yet",
                "slides.no_data.goto_home": "Return to Home",
                "slides.download_all": "Download All",
                "slides.delete_stream": "Delete Course Data",
                "slides.prev": "Previous",
                "slides.next": "Next",
                "slides.download": "Download",
                "slides.close": "Close",
                "slides.init_failed": "Initialization failed, please refresh the page and try again",
                "slides.loading_stats": "Loading statistics...",
                "slides.loading_courses": "Loading course list...",
                "slides.load_failed": "Loading failed",
                "slides.no_data_to_clear": "No data to clear",
                "slides.confirm_clear_all": "Are you sure you want to clear all data?\n\nThis will delete {{totalSlides}} slides from {{totalStreams}} courses\nStorage used: {{totalSize}}\n\nThis action cannot be undone!",
                "slides.clearing_data": "Clearing all data...",
                "slides.all_data_cleared": "All data has been cleared",
                "slides.clear_failed": "Failed to clear data",
                "slides.refreshing_all": "Refreshing all data...",
                "slides.refresh_failed": "Failed to refresh data",
                "slides.loading_initial": "Loading data...",
                "common.loading": "Loading...",
                "common.error": "Error",
                "common.success": "Success",
                "common.teacher": "Teacher",
                "common.location": "Location", 
                "common.time": "Time",
                "common.period": "Period",
                "common.slides_count": "slides",
                "common.last_accessed": "Last accessed",
                "common.view_slides": "View Slides",
                "common.delete_data": "Delete Data",
                "common.unknown": "Unknown",
                "common.loading_slides": "Loading slides...",
                "common.course_slides": "Course Slides",
                "common.slide_alt": "Slide",
                "common.load_slides_failed": "Failed to load slides",
                "common.download_failed": "Download failed",
                "common.no_slides_download": "No slides available for download",
                "common.packing_download": "Packing for download...",
                "common.pack_download_failed": "Pack download failed",
                "common.confirm_delete_course": "Are you sure you want to delete all {{count}} slides for \"{{title}}\"?\n\nThis action cannot be undone!",
                "common.deleting_data": "Deleting data...",
                "common.delete_success": "Deleted successfully",
                "common.delete_failed": "Delete failed",
                "session.restore_title": "Previous Session Detected",
                "session.restore_message": "Found {{count}} slides saved from watching this course previously.",
                "session.restore_question": "Would you like to restore and display these slides?",
                "session.restore_tip": "After restoration, you can continue extracting new slides or view all saved slides in the {{slideManagerLink}}.",
                "session.restore_tip_link_text": "Slide Manager",
                "session.restore_btn": "Restore",
                "session.discard_btn": "Don't Restore",
                "session.restore_success": "Restored {{count}} slides successfully",
                "session.restore_failed": "Failed to restore slides"
            },
            zh: {
                "site.title": "延河课堂 - RUC 课程平台",
                "nav.title": "延河课堂",
                "nav.subtitle": "Razzakov University College",
                "nav.back_home": "首页",
                "nav.home": "首页",
                "nav.slides": "查看已储存的幻灯片",
                "hero.title": "拉扎科夫大学学院学生课程平台",
                "hero.subtitle": "观看延河课堂直播课程并实时获取课程幻灯片",
                "hero.motto": "为比什凯克理工大学（BIT）学生设计。使用我们的服务即表示您同意我们的条款和条件。",
                "instructions.title": "使用指南",
                "instructions.toggle": "显示使用说明",
                "instructions.step1.title": "从延河课堂获取密钥​",
                "instructions.step1.desc": "我们非常重视您的账户安全。如果您完全信任本服务，可以直接通过 BIT 统一身份认证 (SSO) 登录。作为替代方案，如果您希望避免直接输入密码，可以先登录“延河课堂”官网，然后使用我们的书签工具提取访问密钥。在密钥​有效期内，此操作只需执行一次。",
                "instructions.bookmark.title": "书签工具",
                "instructions.bookmark.instruction": "将下面的“获取延河课堂密钥”按钮拖拽到您的书签栏/收藏栏，然后进入延河课堂网站并在书签栏上点击它：",
                "instructions.bookmark.button": "获取延河课堂密钥​",
                "instructions.bookmark.note": "提示：在 iOS Safari 上，按住并拖动上面的“获取延河课堂密钥”按钮，保持手指按住不放，用另一只手轻点屏幕底部的“书本”图标，在新打开的书签栏页面，将按钮拖放到你想要的位置；在桌面浏览器上，按下 Ctrl/Cmd+Shift+B 显示书签栏。",
                "instructions.step2.title": "输入您的密钥​",
                "instructions.step2.desc": "将从延河课堂复制的密钥​粘贴到下面的输入框中。我们绝不会在服务器上储存您的账户、密码或任何个人身份信息​。",
                "instructions.step3.title": "观看直播课程",
                "instructions.step3.desc": "要查看您本学期注册的课程，请查看个人直播列表；要查看当前时段全校的直播课程，请切换到全校直播列表。您还可以输入关键词搜索想要观看的课程。",
                "instructions.step4.title": "启用幻灯片自动提取",
                "instructions.step4.desc": "选择观看屏幕录制时，可启用幻灯片自动提取功能。在移动设备上启用此功能时，需保持浏览器标签页为活跃状态并置于前台。提示：在 iOS Safari 上，切换应用、锁定屏幕可能导致幻灯片提取中止，您可以进入全屏或画中画播放模式并关闭自动锁屏。",
                "instructions.step5.title": "管理您的已储存幻灯片",
                "instructions.step5.desc": "幻灯片会保存在您浏览器的本地数据库中，点击“查看已储存幻灯片”可进行管理。​提示：若在直播页面下载失败，您可返回此处查看并下载所有已储存的幻灯片；若本地数据库出现索引错误，可尝试通过“清理所有数据”功能进行修复。​​",
                "instructions.step6.title": "下载录播视频",
                "instructions.step6.desc": "想要下载延河课堂的录播课程视频吗？你可以使用我们的 Electron App 版下载器：",
                "token.title": "访问密钥​",
                "token.placeholder": "请输入您的延河课堂密钥​...",
                "token.save": "保存密钥​",
                "token.clear": "清除密钥​",
                "token.login": "账户密码登录",
                "token.saved": "Token 保存成功！",
                "token.cleared": "Token 已清除！",
                "token.error": "请输入有效的密钥​",
                "token.auto_filled": "Token已自动填入并保存！",
                "token.verifying": "正在验证密钥​...",
                "token.valid": "Token 有效",
                "token.invalid": "Token 无效",
                "login.title": "账户密码登录",
                "login.username": "学号",
                "login.password": "密码",
                "login.username_placeholder": "请输入您的学号",
                "login.password_placeholder": "请输入您的密码",
                "login.submit": "登录",
                "login.cancel": "取消",
                "login.status.logging_in": "正在登录...",
                "login.status.success": "登录成功！Token已自动填入",
                "login.error.empty_fields": "请填写完整的学号和密码",
                "streams.title": "课程列表",
                "streams.personal": "个人课程",
                "streams.public": "全校课程",
                "streams.no_streams.title": "未找到课程",
                "streams.no_streams.desc": "请检查您的密钥​并重试。",
                "streams.status.live": "直播中",
                "streams.status.upcoming": "即将开始",
                "streams.status.ended": "已结束",
                "streams.participants": "{{count}} 人观看",
                "streams.watch": "观看直播",
                "filter.enable": "启用筛选",
                "filter.title_placeholder": "输入课程标题进行搜索...",
                "filter.no_results.title": "未找到匹配的直播",
                "filter.no_results.desc": "没有直播符合您的搜索条件。请尝试调整搜索词或清除筛选以查看所有直播。",
                "filter.search_range.16": "在前16项中搜索",
                "filter.search_range.32": "在前32项中搜索",
                "filter.search_range.64": "在前64项中搜索",
                "filter.search_range.128": "在前128项中搜索",
                "filter.error.empty_title": "请输入课程标题进行搜索",
                "search.keyword_placeholder": "输入关键词搜索课程...",
                "search.button": "搜索",
                "search.error.empty_keyword": "请输入搜索关键词",
                "search.no_results.title": "未找到搜索结果",
                "search.no_results.desc": "未找到与您搜索相关的课程，请尝试其他关键词。",
                "pagination.prev": "上一页",
                "pagination.next": "下一页",
                "pagination.page": "第 {{current}} 页，共 {{total}} 页",
                "debug.title": "调试模式",
                "debug.close": "关闭",
                "debug.m3u8.title": "M3U8 流地址",
                "debug.m3u8.desc": "输入直接的 m3u8 流地址进行测试",
                "debug.m3u8.placeholder": "https://example.com/stream.m3u8",
                "debug.m3u8.button": "测试 M3U8",
                "debug.local.title": "本地视频文件",
                "debug.local.desc": "上传本地视频文件进行测试",
                "debug.local.input": "选择视频文件",
                "debug.local.button": "测试视频",
                "debug.hint": "按 Ctrl+Shift+D 切换调试模式",
                "debug.error.empty_url": "请输入有效的 M3U8 地址",
                "debug.error.invalid_url": "请输入有效的网址",
                "debug.success.stream_added": "调试流 \"{{title}}\" 添加成功！",
                "loading": "加载中...",
                "error.general": "发生错误，请重试。",
                "error.network": "网络错误，请检查您的连接。",
                "error.token_required": "请先输入您的密钥​。",
                "footer.terms": "条款和条件",
                "footer.yanhekt": "延河课堂",
                "footer.old_version": "返回旧版",
                "footer.github": "GitHub",
                "footer.copyright": "© 2025 拉扎科夫大学学院 | 延河课堂™是其权利人的商标 | 第三方内容的著作权及其他知识产权归其内容提供者所有",
                "terms.title": "TERMS AND CONDITIONS",
                "modal.close": "关闭",
                "live.title": "直播课堂 - RUC 课程平台",
                "live.camera_stream": "课堂摄像头",
                "live.screen_stream": "屏幕录制",
                "live.copy_url": "复制视频流地址",
                "live.fullscreen": "全屏",
                "live.loading": "加载中...",
                "live.buffering": "缓冲中...",
                "live.video_error": "视频播放错误",
                "live.video_not_supported": "您的浏览器不支持视频标签。",
                "live.stream_not_available": "视频流不可用",
                "live.stream_error": "加载视频流失败",
                "live.click_to_play": "点击播放",
                "live.no_stream_data": "未找到直播数据。请返回首页。",
                "live.invalid_stream_data": "无效的视频流数据。",
                "live.no_url_to_copy": "没有可复制的地址",
                "live.copy_failed": "复制地址失败",
                "live.copied": "已复制！",
                "live.stream_urls": "视频流地址",
                "live.camera_url": "课堂摄像头视频流地址：",
                "live.screen_url": "屏幕录制视频流地址：",
                "live.copy": "复制",
                "slide.title": "幻灯片提取",
                "slide.enable": "启用自动提取",
                "slide.settings": "设置",
                "slide.check_interval": "检测间隔 (毫秒)：",
                "slide.double_verification": "启用二次验证",
                "slide.verification_count": "验证次数：",
                "slide.status_stopped": "已停止",
                "slide.slides_captured": "已捕获幻灯片：",
                "slide.download": "下载幻灯片",
                "slide.clear": "清空幻灯片",
                "slide.running": "运行中...",
                "slide.stopped": "已停止",
                "slide.verification_failed": "验证失败，重新检测中...",
                "slide.verifying": "验证中...",
                "slide.change_detected": "检测到变化，开始验证...",
                "slide.packing": "正在打包幻灯片...",
                "slide.download_complete": "下载完成！",
                "slide.download_zip": "下载幻灯片 ZIP",
                "slide.error_no_player": "未找到视频播放器，请先开始播放视频",
                "slide.error_no_slides": "没有可下载的幻灯片",
                "slide.error_pack_failed": "打包下载失败",
                "slide.confirm_clear": "确定要清空所有 {{count}} 张幻灯片吗？",
                "slide.no_slides_to_clear": "没有幻灯片需要清空",
                "slide.confirm_delete_all": "确定要删除当前直播的所有 {{count}} 张幻灯片吗？此操作不可恢复！\n\n这将永久删除数据库中保存的幻灯片数据。",
                "slide.slides_deleted": "幻灯片已成功删除",
                "slide.delete_failed": "删除失败",
                "slide.session_restore_title": "检测到上次会话",
                "slide.session_restore_message": "检测到上次在观看此直播时正在提取幻灯片，是否继续提取？\n已保存 {{count}} 张幻灯片",
                "slides.title": "幻灯片管理 - RUC 课程平台",
                "slides.page_title": "幻灯片管理",
                "slides.page_description": "管理和查看从直播课程中提取的幻灯片",
                "slides.storage_stats": "存储统计",
                "slides.total_streams": "直播课程",
                "slides.total_slides": "总幻灯片",
                "slides.total_size": "占用空间",
                "slides.refresh": "刷新统计",
                "slides.clear_all": "清空所有数据",
                "slides.stream_list": "已保存幻灯片的课程",
                "slides.sort.recent": "最近访问",
                "slides.sort.date": "上课时间",
                "slides.sort.slides": "幻灯片数量",
                "slides.sort.title": "课程名称",
                "slides.no_data.title": "暂无数据",
                "slides.no_data.desc": "还没有保存过任何幻灯片",
                "slides.no_data.goto_home": "回到主页",
                "slides.download_all": "下载全部",
                "slides.delete_stream": "删除此课程数据",
                "slides.prev": "上一张",
                "slides.next": "下一张",
                "slides.download": "下载",
                "slides.close": "关闭",
                "slides.init_failed": "初始化失败，请刷新页面重试",
                "slides.loading_stats": "正在加载统计信息...",
                "slides.loading_courses": "正在加载课程列表...",
                "slides.load_failed": "加载失败",
                "slides.no_data_to_clear": "没有数据需要清空",
                "slides.confirm_clear_all": "确定要清空所有数据吗？\n\n将删除 {{totalStreams}} 个课程的 {{totalSlides}} 张幻灯片\n占用空间：{{totalSize}}\n\n此操作不可恢复！",
                "slides.clearing_data": "正在清空所有数据...",
                "slides.all_data_cleared": "所有数据已清空",
                "slides.clear_failed": "清空数据失败",
                "slides.refreshing_all": "正在刷新所有数据...",
                "slides.refresh_failed": "刷新数据失败",
                "slides.loading_initial": "正在加载数据...",
                "common.loading": "正在加载...",
                "common.error": "错误",
                "common.success": "成功",
                "common.teacher": "教师",
                "common.location": "地点",
                "common.time": "时间", 
                "common.period": "节次",
                "common.slides_count": "张幻灯片",
                "common.last_accessed": "最近访问",
                "common.view_slides": "查看幻灯片",
                "common.delete_data": "删除数据",
                "common.unknown": "未知",
                "common.loading_slides": "正在加载幻灯片...",
                "common.course_slides": "课程幻灯片",
                "common.slide_alt": "幻灯片",
                "common.load_slides_failed": "加载幻灯片失败",
                "common.download_failed": "下载失败",
                "common.no_slides_download": "没有可下载的幻灯片",
                "common.packing_download": "正在打包下载...",
                "common.pack_download_failed": "打包下载失败",
                "common.confirm_delete_course": "确定要删除\"{{title}}\"的所有 {{count}} 张幻灯片吗？\n\n此操作不可恢复！",
                "common.deleting_data": "正在删除数据...",
                "common.delete_success": "删除成功",
                "common.delete_failed": "删除失败",
                "session.restore_title": "检测到上次保存的幻灯片",
                "session.restore_message": "检测到此直播课程中有 {{count}} 张已保存的幻灯片。",
                "session.restore_question": "是否要恢复显示这些幻灯片？",
                "session.restore_tip": "恢复后可以继续提取新的幻灯片，也可以在{{slideManagerLink}}查看所有保存的幻灯片。",
                "session.restore_tip_link_text": "幻灯片管理页面",
                "session.restore_btn": "恢复显示",
                "session.discard_btn": "不恢复",
                "session.restore_success": "已恢复显示 {{count}} 张幻灯片",
                "session.restore_failed": "恢复幻灯片失败"
            }
        };
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = button.getAttribute('data-lang');
                this.setLanguage(lang);
            });
        });
    }
    
    /**
     * 设置语言
     */
    async setLanguage(lang) {
        if (lang === this.currentLanguage) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        this.updateLanguageButtons();
        this.translatePage();
        
        // 更新页面标题
        document.title = this.get('site.title');
        
        // 触发语言变更事件
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
    
    /**
     * 更新语言按钮状态
     */
    updateLanguageButtons() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            if (lang === this.currentLanguage) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * 翻译整个页面
     */
    translatePage() {
        // 翻译带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });
        
        // 翻译带有 data-i18n-placeholder 属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
            }
        });
        
        // 翻译带有 data-i18n-title 属性的元素
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.title = translation;
            }
        });

        // 翻译select选项
        const optionElements = document.querySelectorAll('option[data-i18n]');
        optionElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });
    }
    
    /**
     * 获取翻译文本
     */
    get(key, params = {}) {
        // 直接使用点号分隔的键查找翻译
        let value = this.translations[this.currentLanguage] && this.translations[this.currentLanguage][key];
        
        // 如果当前语言中没有找到，回退到英文
        if (!value) {
            value = this.translations.en && this.translations.en[key];
        }
        
        // 如果还是没找到，返回键本身
        if (!value) {
            return key;
        }
        
        // 处理参数替换
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }
        
        return value;
    }
    
    /**
     * 获取当前语言
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    /**
     * 动态添加翻译
     */
    addTranslations(lang, translations) {
        if (!this.translations[lang]) {
            this.translations[lang] = {};
        }
        Object.assign(this.translations[lang], translations);
    }
    
    /**
     * 格式化日期
     */
    formatDate(date, options = {}) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (this.currentLanguage === 'zh') {
            return dateObj.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                ...options
            });
        } else {
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                ...options
            });
        }
    }
    
    /**
     * 格式化数字
     */
    formatNumber(number) {
        if (this.currentLanguage === 'zh') {
            return number.toLocaleString('zh-CN');
        } else {
            return number.toLocaleString('en-US');
        }
    }
    
    /**
     * 安全地处理包含HTML的翻译文本
     * 这个方法可以用于需要在翻译中包含简单HTML的情况
     * 只允许安全的HTML标签，如 <strong>, <em>, <a> 等
     */
    getSafeHtml(key, params = {}, allowedTags = ['strong', 'em', 'a', 'br']) {
        const text = this.get(key, params);
        
        // 简单的HTML标签白名单验证
        // 在实际项目中，建议使用专业的HTML清理库如DOMPurify
        const tagPattern = new RegExp(`<(/?(?:${allowedTags.join('|')}))(?:\\s[^>]*)?>`, 'gi');
        const hasOnlyAllowedTags = text.replace(tagPattern, '').indexOf('<') === -1;
        
        if (hasOnlyAllowedTags) {
            return text;
        } else {
            // 如果包含不安全的标签，返回纯文本版本
            return this.escapeHtml(text);
        }
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
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

// 创建全局i18n实例
window.i18n = new I18n();
