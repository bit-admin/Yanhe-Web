/**
 * 动态生成书签工具链接
 * 自动检测当前网站URL并生成相应的返回链接
 */
class BookmarkGenerator {
    /**
     * 生成书签工具的JavaScript代码
     */
    static generateBookmarkCode() {
        // 获取当前网站的URL（去除查询参数）
        const currentUrl = window.location.origin + window.location.pathname;
        
        // 检测当前语言
        const currentLanguage = window.i18n ? window.i18n.getCurrentLanguage() : 'zh';
        
        // 中文版书签代码
        const bookmarkCodeZh = `
(function() {
    const hostname = window.location.hostname;
    const isYanhekt = hostname.includes('yanhekt.cn');
    const returnUrl = '${currentUrl}';
    
    if (!isYanhekt) {
        const confirmed = confirm(
            '检测到当前不在延河课堂网站，是否跳转到延河课堂进行登录？\\n\\n' +
            '跳转后请再次点击书签工具获取 Token！'
        );
        if (confirmed) {
            window.open('https://www.yanhekt.cn', '_blank');
        }
        return;
    }
    
    try {
        const authData = localStorage.getItem('auth');
        if (!authData) {
            alert('未找到登录信息，请先登录延河课堂！');
            return;
        }
        
        const token = JSON.parse(authData).token;
        if (!token) {
            alert('Token为空，请重新登录延河课堂！');
            return;
        }
        
        const confirmed = confirm(
            'Token获取成功！\\n\\n' +
            '是否返回 RUC Portal 并自动填入Token？\\n\\n' +
            '点击确定将跳转并自动填入，点击取消手动复制Token。'
        );
        
        if (confirmed) {
            window.open(returnUrl + '?token=' + encodeURIComponent(token), '_blank');
        } else {
            const copyToClipboard = async (text) => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                        return true;
                    } else {
                        const textArea = document.createElement('textarea');
                        textArea.value = text;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const result = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        return result;
                    }
                } catch (err) {
                    return false;
                }
            };
            
            copyToClipboard(token).then(success => {
                if (success) {
                    alert('Token已成功复制到剪贴板！\\n\\n' + token);
                } else {
                    prompt('自动复制失败，请手动复制Token:', token);
                }
            }).catch(() => {
                prompt('自动复制失败，请手动复制Token:', token);
            });
        }
    } catch (e) {
        alert('获取Token失败: ' + e.message + '\\n请确保已正确登录延河课堂！');
    }
})();
        `.trim();
        
        // 英文版书签代码
        const bookmarkCodeEn = `
(function() {
    const hostname = window.location.hostname;
    const isYanhekt = hostname.includes('yanhekt.cn');
    const returnUrl = '${currentUrl}';
    
    if (!isYanhekt) {
        const confirmed = confirm(
            'Not on Yanhekt website detected. Would you like to go to Yanhekt for login?\\n\\n' +
            'Please click the bookmark tool again after jumping to get the token!'
        );
        if (confirmed) {
            window.open('https://www.yanhekt.cn', '_blank');
        }
        return;
    }
    
    try {
        const authData = localStorage.getItem('auth');
        if (!authData) {
            alert('No login information found, please login to Yanhekt first!');
            return;
        }
        
        const token = JSON.parse(authData).token;
        if (!token) {
            alert('Token is empty, please re-login to Yanhekt!');
            return;
        }
        
        const confirmed = confirm(
            'Token obtained successfully!\\n\\n' +
            'Would you like to return to RUC Portal and auto-fill the token?\\n\\n' +
            'Click OK to jump and auto-fill, click Cancel to manually copy the token.'
        );
        
        if (confirmed) {
            window.open(returnUrl + '?token=' + encodeURIComponent(token), '_blank');
        } else {
            const copyToClipboard = async (text) => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                        return true;
                    } else {
                        const textArea = document.createElement('textarea');
                        textArea.value = text;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const result = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        return result;
                    }
                } catch (err) {
                    return false;
                }
            };
            
            copyToClipboard(token).then(success => {
                if (success) {
                    alert('Token copied to clipboard successfully!\\n\\n' + token);
                } else {
                    prompt('Auto-copy failed, please manually copy the token:', token);
                }
            }).catch(() => {
                prompt('Auto-copy failed, please manually copy the token:', token);
            });
        }
    } catch (e) {
        alert('Failed to get token: ' + e.message + '\\nPlease make sure you are logged in to Yanhekt!');
    }
})();
        `.trim();
        
        // 根据当前语言选择相应的代码
        const selectedCode = currentLanguage === 'en' ? bookmarkCodeEn : bookmarkCodeZh;
        
        // 压缩代码（移除不必要的空格和换行）
        return 'javascript:' + selectedCode.replace(/\s+/g, ' ').replace(/;\s*}/g, ';}');
    }
    
    /**
     * 更新页面中的书签链接
     */
    static updateBookmarkLink() {
        const bookmarkLink = document.querySelector('.bookmark-tool-btn');
        if (bookmarkLink) {
            bookmarkLink.href = this.generateBookmarkCode();
        }
    }
    
    /**
     * 初始化书签生成器
     */
    static init() {
        // 页面加载完成后更新书签链接
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateBookmarkLink();
            });
        } else {
            this.updateBookmarkLink();
        }
        
        // 监听语言切换事件，重新生成书签
        window.addEventListener('languageChanged', () => {
            this.updateBookmarkLink();
        });
    }
}

// 自动初始化
BookmarkGenerator.init();
