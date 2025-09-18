/**
 * 幻灯片存储管理器
 * 使用 IndexedDB 进行数据持久化存储
 */
class SlideStorageManager {
    constructor() {
        this.dbName = 'SlideExtractorDB';
        this.dbVersion = 2;
        this.db = null;
    }
    
    /**
     * 初始化数据库
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                
                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
                
                // 直播课程信息表
                if (!db.objectStoreNames.contains('streams')) {
                    console.log('Creating streams object store');
                    const streamStore = db.createObjectStore('streams', { keyPath: 'id' });
                    streamStore.createIndex('title', 'title', { unique: false });
                    streamStore.createIndex('date', 'schedule_started_at', { unique: false });
                    streamStore.createIndex('professor', 'session.professor.name', { unique: false });
                    streamStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }
                
                // 幻灯片存储表
                if (!db.objectStoreNames.contains('slides')) {
                    console.log('Creating slides object store');
                    const slideStore = db.createObjectStore('slides', { keyPath: 'id' });
                    slideStore.createIndex('streamId', 'streamId', { unique: false });
                    slideStore.createIndex('timestamp', 'timestamp', { unique: false });
                    slideStore.createIndex('capturedAt', 'capturedAt', { unique: false });
                }
                
                // 缩略图存储表（用于预览）
                if (!db.objectStoreNames.contains('thumbnails')) {
                    console.log('Creating thumbnails object store');
                    const thumbStore = db.createObjectStore('thumbnails', { keyPath: 'slideId' });
                    thumbStore.createIndex('streamId', 'streamId', { unique: false });
                    thumbStore.createIndex('capturedAt', 'capturedAt', { unique: false });
                }
                
                // 会话状态表（用于恢复中断的会话）
                if (!db.objectStoreNames.contains('sessions')) {
                    console.log('Creating sessions object store');
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'streamId' });
                    sessionStore.createIndex('lastAccess', 'lastAccess', { unique: false });
                }
                
                // 如果是从旧版本升级，可能需要数据迁移
                if (oldVersion < 2) {
                    console.log('Performing data migration for version 2');
                    // 这里可以添加数据迁移逻辑
                }
            };
        });
    }
    
    /**
     * 保存直播课程信息
     */
    async saveStreamInfo(streamData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams'], 'readwrite');
            const store = tx.objectStore('streams');
            
            const now = new Date().toISOString();
            
            // 添加额外的元数据
            const streamInfo = {
                ...streamData,
                firstSaved: streamData.firstSaved || now,
                lastAccessed: now,
                slideCount: streamData.slideCount || 0
            };
            
            const request = store.put(streamInfo);
            request.onsuccess = () => {
                console.log('Stream info saved:', streamInfo.id);
                resolve(streamInfo);
            };
            request.onerror = () => {
                console.error('Failed to save stream info:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * 保存幻灯片
     */
    async saveSlide(streamId, slideData, imageBlob) {
        // 确保 streamId 的类型一致性 - 统一转换为字符串
        const normalizedStreamId = String(streamId);
        const slideId = `slide_${normalizedStreamId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const slide = {
            id: slideId,
            streamId: normalizedStreamId,
            title: slideData.title,
            capturedAt: new Date().toISOString(),
            timestamp: slideData.timestamp || new Date().toISOString(),
            blob: imageBlob,
            size: imageBlob.size,
            width: slideData.width,
            height: slideData.height
        };
        
        // 生成缩略图
        const thumbnail = await this.generateThumbnail(imageBlob);
        const thumbData = {
            slideId: slideId,
            streamId: normalizedStreamId,
            dataUrl: thumbnail,
            capturedAt: slide.capturedAt
        };
        
        // 使用事务保存数据
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['slides', 'thumbnails', 'streams'], 'readwrite');
            let completedOperations = 0;
            const totalOperations = 3; // slide, thumbnail, stream update
            
            const checkComplete = () => {
                completedOperations++;
                if (completedOperations === totalOperations) {
                    resolve(slideId);
                }
            };
            
            // 保存幻灯片
            const slideRequest = tx.objectStore('slides').add(slide);
            slideRequest.onsuccess = checkComplete;
            slideRequest.onerror = () => reject(slideRequest.error);
            
            // 保存缩略图
            const thumbRequest = tx.objectStore('thumbnails').add(thumbData);
            thumbRequest.onsuccess = checkComplete;
            thumbRequest.onerror = () => reject(thumbRequest.error);
            
            // 更新直播课程的幻灯片计数
            const streamStore = tx.objectStore('streams');
            const getStreamRequest = streamStore.get(streamId);
            getStreamRequest.onsuccess = () => {
                const streamInfo = getStreamRequest.result;
                if (streamInfo) {
                    streamInfo.slideCount = (streamInfo.slideCount || 0) + 1;
                    streamInfo.lastAccessed = new Date().toISOString();
                    
                    const updateRequest = streamStore.put(streamInfo);
                    updateRequest.onsuccess = checkComplete;
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    checkComplete(); // 如果没有找到流信息，跳过更新
                }
            };
            getStreamRequest.onerror = () => reject(getStreamRequest.error);
        });
    }
    
    /**
     * 获取所有有幻灯片的直播课程
     */
    async getAllStreamsWithSlides() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams', 'slides'], 'readonly');
            const streamStore = tx.objectStore('streams');
            const slideStore = tx.objectStore('slides');
            
            const streamRequest = streamStore.getAll();
            
            streamRequest.onsuccess = () => {
                try {
                    const streams = streamRequest.result || [];
                    
                    if (streams.length === 0) {
                        resolve([]);
                        return;
                    }
                    
                    const streamsWithSlides = [];
                    let processedStreams = 0;
                    
                    // 为每个直播课程验证实际的幻灯片数量
                    streams.forEach((stream, index) => {
                        // 确保 streamId 的类型一致性 - 统一转换为字符串
                        const normalizedStreamId = String(stream.id);
                        
                        const slideIndex = slideStore.index('streamId');
                        const slideCountRequest = slideIndex.count(normalizedStreamId);
                        
                        slideCountRequest.onsuccess = () => {
                            const actualSlideCount = slideCountRequest.result;
                            
                            processedStreams++;
                            
                            // 如果实际数量大于0，添加到结果中
                            if (actualSlideCount > 0) {
                                // 更新stream对象的slideCount，以防数据不一致
                                stream.slideCount = actualSlideCount;
                                streamsWithSlides.push(stream);
                            }
                            
                            // 检查是否所有流都已处理完成
                            if (processedStreams === streams.length) {
                                // 按最后访问时间排序
                                const sortedStreams = streamsWithSlides.sort((a, b) => {
                                    const dateA = new Date(a.lastAccessed || a.firstSaved || '1970-01-01');
                                    const dateB = new Date(b.lastAccessed || b.firstSaved || '1970-01-01');
                                    return dateB - dateA;
                                });
                                
                                resolve(sortedStreams);
                            }
                        };
                        
                        slideCountRequest.onerror = (error) => {
                            console.error('Failed to count slides for stream:', stream.id, error);
                            processedStreams++;
                            
                            if (processedStreams === streams.length) {
                                console.log('getAllStreamsWithSlides: Processing complete with errors, found', streamsWithSlides.length, 'streams with slides');
                                resolve(streamsWithSlides);
                            }
                        };
                    });
                } catch (error) {
                    console.error('getAllStreamsWithSlides: Exception:', error);
                    reject(error);
                }
            };
            
            streamRequest.onerror = () => {
                console.error('Failed to get streams:', streamRequest.error);
                reject(streamRequest.error);
            };
        });
    }
    
    /**
     * 获取所有直播课程（包括没有幻灯片的）
     */
    async getAllStreams() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams'], 'readonly');
            const store = tx.objectStore('streams');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const streams = request.result || [];
                resolve(streams);
            };
            
            request.onerror = () => {
                console.error('Failed to get all streams:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * 获取指定直播的所有幻灯片缩略图
     */
    async getSlidesForStream(streamId) {
        return new Promise((resolve, reject) => {
            // 确保 streamId 的类型一致性
            const normalizedStreamId = String(streamId);
            
            const tx = this.db.transaction(['thumbnails'], 'readonly');
            const index = tx.objectStore('thumbnails').index('streamId');
            const request = index.getAll(normalizedStreamId);
            
            request.onsuccess = () => {
                const thumbnails = request.result || [];
                const sortedThumbnails = thumbnails.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
                resolve(sortedThumbnails);
            };
            
            request.onerror = () => {
                console.error('Failed to get slides for stream:', request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * 获取幻灯片的完整数据（包含原图）
     */
    async getSlideBlob(slideId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['slides'], 'readonly');
            const store = tx.objectStore('slides');
            const request = store.get(slideId);
            
            request.onsuccess = () => {
                const slide = request.result;
                resolve(slide ? slide.blob : null);
            };
            
            request.onerror = () => {
                console.error('Failed to get slide blob:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取指定直播的所有完整幻灯片数据（用于下载）
     */
    async getAllSlidesWithBlobsForStream(streamId) {
        return new Promise((resolve, reject) => {
            // 确保 streamId 的类型一致性
            const normalizedStreamId = String(streamId);
            console.log('Safari Debug: Getting slides for streamId:', normalizedStreamId);
            
            if (!this.db) {
                console.error('Safari Debug: Database not available');
                reject(new Error('Database not available'));
                return;
            }
            
            try {
                const tx = this.db.transaction(['slides'], 'readonly');
                
                // Safari特定的事务错误处理
                tx.onerror = (event) => {
                    console.error('Safari Debug: Transaction error:', event.target.error);
                    reject(event.target.error);
                };
                
                tx.onabort = (event) => {
                    console.error('Safari Debug: Transaction aborted:', event.target.error);
                    reject(new Error('Transaction aborted'));
                };
                
                const index = tx.objectStore('slides').index('streamId');
                const request = index.getAll(normalizedStreamId);
                
                request.onsuccess = () => {
                    try {
                        const slides = request.result || [];
                        console.log(`Safari Debug: Found ${slides.length} slides in database`);
                        
                        // 验证每个slide的数据完整性
                        const validSlides = slides.filter(slide => {
                            const isValid = slide && slide.id && slide.blob && slide.blob instanceof Blob;
                            if (!isValid) {
                                console.warn('Safari Debug: Invalid slide data:', slide);
                            }
                            return isValid;
                        });
                        
                        console.log(`Safari Debug: ${validSlides.length} valid slides after filtering`);
                        
                        const sortedSlides = validSlides.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
                        resolve(sortedSlides);
                    } catch (error) {
                        console.error('Safari Debug: Error processing slides:', error);
                        reject(error);
                    }
                };
                
                request.onerror = () => {
                    console.error('Safari Debug: Request error:', request.error);
                    reject(request.error);
                };
                
            } catch (error) {
                console.error('Safari Debug: Exception in getAllSlidesWithBlobsForStream:', error);
                reject(error);
            }
        });
    }
    
    /**
     * 删除指定直播的所有数据
     */
    async deleteStreamData(streamId) {
        return new Promise((resolve, reject) => {
            // 确保 streamId 的类型一致性
            const normalizedStreamId = String(streamId);
            console.log('deleteStreamData: Starting deletion for stream:', normalizedStreamId, typeof normalizedStreamId);
            
            const tx = this.db.transaction(['streams', 'slides', 'thumbnails', 'sessions'], 'readwrite');
            let completedOperations = 0;
            const totalOperations = 4; // streams, slides, thumbnails, sessions
            
            const checkComplete = () => {
                completedOperations++;
                if (completedOperations === totalOperations) {
                    resolve();
                }
            };
            
            // 删除直播信息
            const deleteStreamRequest = tx.objectStore('streams').delete(normalizedStreamId);
            deleteStreamRequest.onsuccess = checkComplete;
            deleteStreamRequest.onerror = () => reject(deleteStreamRequest.error);
            
            // 删除所有相关幻灯片
            const slideIndex = tx.objectStore('slides').index('streamId');
            const slidesRequest = slideIndex.getAll(normalizedStreamId);
            slidesRequest.onsuccess = () => {
                const slides = slidesRequest.result || [];
                if (slides.length === 0) {
                    checkComplete();
                    return;
                }
                
                let deletedSlides = 0;
                slides.forEach(slide => {
                    const deleteRequest = tx.objectStore('slides').delete(slide.id);
                    deleteRequest.onsuccess = () => {
                        deletedSlides++;
                        if (deletedSlides === slides.length) {
                            checkComplete();
                        }
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            slidesRequest.onerror = () => reject(slidesRequest.error);
            
            // 删除所有相关缩略图
            const thumbIndex = tx.objectStore('thumbnails').index('streamId');
            const thumbsRequest = thumbIndex.getAll(normalizedStreamId);
            thumbsRequest.onsuccess = () => {
                const thumbnails = thumbsRequest.result || [];
                if (thumbnails.length === 0) {
                    checkComplete();
                    return;
                }
                
                let deletedThumbs = 0;
                thumbnails.forEach(thumb => {
                    const deleteRequest = tx.objectStore('thumbnails').delete(thumb.slideId);
                    deleteRequest.onsuccess = () => {
                        deletedThumbs++;
                        if (deletedThumbs === thumbnails.length) {
                            checkComplete();
                        }
                    };
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            };
            thumbsRequest.onerror = () => reject(thumbsRequest.error);
            
            // 删除会话状态
            const deleteSessionRequest = tx.objectStore('sessions').delete(normalizedStreamId);
            deleteSessionRequest.onsuccess = checkComplete;
            deleteSessionRequest.onerror = () => reject(deleteSessionRequest.error);
        });
    }
    
    /**
     * 删除指定直播的幻灯片数据（保留直播信息）
     */
    async deleteStreamSlides(streamId) {
        // 确保 streamId 的类型一致性
        const normalizedStreamId = String(streamId);
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams', 'slides', 'thumbnails'], 'readwrite');
            let completedOperations = 0;
            const totalOperations = 3; // slides, thumbnails, update stream
            
            const checkComplete = () => {
                completedOperations++;
                console.log(`deleteStreamSlides: Completed operation ${completedOperations}/${totalOperations}`);
                if (completedOperations === totalOperations) {
                    console.log('deleteStreamSlides: All operations completed successfully');
                    resolve();
                }
            };
            
            const handleError = (error, operation) => {
                console.error(`deleteStreamSlides: Error in ${operation}:`, error);
                reject(error);
            };
            
            // 删除所有相关幻灯片
            const slideIndex = tx.objectStore('slides').index('streamId');
            const slidesRequest = slideIndex.getAll(normalizedStreamId);
            slidesRequest.onsuccess = () => {
                const slides = slidesRequest.result || [];
                console.log(`deleteStreamSlides: Found ${slides.length} slides to delete`);
                
                if (slides.length === 0) {
                    checkComplete();
                    return;
                }
                
                const slideStore = tx.objectStore('slides');
                let deletedSlides = 0;
                
                slides.forEach((slide, index) => {
                    console.log(`deleteStreamSlides: Deleting slide ${index + 1}/${slides.length}: ${slide.id}`);
                    const deleteRequest = slideStore.delete(slide.id);
                    deleteRequest.onsuccess = () => {
                        deletedSlides++;
                        console.log(`deleteStreamSlides: Deleted slide ${deletedSlides}/${slides.length}`);
                        if (deletedSlides === slides.length) {
                            console.log('deleteStreamSlides: All slides deleted');
                            checkComplete();
                        }
                    };
                    deleteRequest.onerror = () => handleError(deleteRequest.error, 'delete slide');
                });
            };
            slidesRequest.onerror = () => handleError(slidesRequest.error, 'get slides');
            
            // 删除所有相关缩略图
            const thumbIndex = tx.objectStore('thumbnails').index('streamId');
            const thumbsRequest = thumbIndex.getAll(normalizedStreamId);
            thumbsRequest.onsuccess = () => {
                const thumbnails = thumbsRequest.result || [];
                console.log(`deleteStreamSlides: Found ${thumbnails.length} thumbnails to delete`);
                
                if (thumbnails.length === 0) {
                    checkComplete();
                    return;
                }
                
                const thumbStore = tx.objectStore('thumbnails');
                let deletedThumbs = 0;
                
                thumbnails.forEach((thumb, index) => {
                    console.log(`deleteStreamSlides: Deleting thumbnail ${index + 1}/${thumbnails.length}: ${thumb.slideId}`);
                    const deleteRequest = thumbStore.delete(thumb.slideId);
                    deleteRequest.onsuccess = () => {
                        deletedThumbs++;
                        console.log(`deleteStreamSlides: Deleted thumbnail ${deletedThumbs}/${thumbnails.length}`);
                        if (deletedThumbs === thumbnails.length) {
                            console.log('deleteStreamSlides: All thumbnails deleted');
                            checkComplete();
                        }
                    };
                    deleteRequest.onerror = () => handleError(deleteRequest.error, 'delete thumbnail');
                });
            };
            thumbsRequest.onerror = () => handleError(thumbsRequest.error, 'get thumbnails');
            
            // 更新直播信息，将幻灯片计数重置为0
            const streamStore = tx.objectStore('streams');
            const getStreamRequest = streamStore.get(normalizedStreamId);
            getStreamRequest.onsuccess = () => {
                const streamInfo = getStreamRequest.result;
                if (streamInfo) {
                    console.log('deleteStreamSlides: Updating stream info, old slideCount:', streamInfo.slideCount);
                    streamInfo.slideCount = 0;
                    streamInfo.lastAccessed = new Date().toISOString();
                    const updateRequest = streamStore.put(streamInfo);
                    updateRequest.onsuccess = () => {
                        console.log('deleteStreamSlides: Stream info updated successfully');
                        checkComplete();
                    };
                    updateRequest.onerror = () => handleError(updateRequest.error, 'update stream');
                } else {
                    console.log('deleteStreamSlides: Stream info not found, skipping update');
                    checkComplete();
                }
            };
            getStreamRequest.onerror = () => handleError(getStreamRequest.error, 'get stream info');
        });
    }
    
    /**
     * 保存/更新会话状态
     */
    async updateSessionState(streamId, state) {
        // 确保 streamId 的类型一致性
        const normalizedStreamId = String(streamId);
        
        const sessionData = {
            streamId: normalizedStreamId,
            lastAccess: new Date().toISOString(),
            isExtracting: state.isExtracting || false,
            extractionSettings: state.extractionSettings || {},
            currentSlideCount: state.currentSlideCount || 0
        };
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['sessions'], 'readwrite');
            const request = tx.objectStore('sessions').put(sessionData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * 获取会话状态
     */
    async getSessionState(streamId) {
        return new Promise((resolve, reject) => {
            // 确保 streamId 的类型一致性
            const normalizedStreamId = String(streamId);
            
            const tx = this.db.transaction(['sessions'], 'readonly');
            const request = tx.objectStore('sessions').get(normalizedStreamId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * 生成缩略图
     */
    async generateThumbnail(blob, maxWidth = 200, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 计算缩略图尺寸
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = URL.createObjectURL(blob);
        });
    }
    
    /**
     * 修复数据库中的幻灯片计数不一致问题
     */
    async fixSlideCountInconsistency() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams', 'slides'], 'readwrite');
            const streamStore = tx.objectStore('streams');
            const slideStore = tx.objectStore('slides');
            
            const streamRequest = streamStore.getAll();
            
            streamRequest.onsuccess = async () => {
                try {
                    const streams = streamRequest.result || [];
                    let fixedCount = 0;
                    
                    for (const stream of streams) {
                        const slideIndex = slideStore.index('streamId');
                        const slideCountRequest = slideIndex.count(stream.id);
                        
                        await new Promise((resolveCount) => {
                            slideCountRequest.onsuccess = () => {
                                const actualSlideCount = slideCountRequest.result;
                                
                                // 如果数据库中的slideCount与实际不一致，修复它
                                if (stream.slideCount !== actualSlideCount) {
                                    stream.slideCount = actualSlideCount;
                                    const updateRequest = streamStore.put(stream);
                                    updateRequest.onsuccess = () => {
                                        fixedCount++;
                                        resolveCount();
                                    };
                                    updateRequest.onerror = () => resolveCount();
                                } else {
                                    resolveCount();
                                }
                            };
                            slideCountRequest.onerror = () => resolveCount();
                        });
                    }
                    
                    console.log(`Fixed ${fixedCount} slide count inconsistencies`);
                    resolve(fixedCount);
                } catch (error) {
                    reject(error);
                }
            };
            
            streamRequest.onerror = () => reject(streamRequest.error);
        });
    }
    
    /**
     * 获取存储使用情况统计
     */
    async getStorageStats() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams', 'slides'], 'readonly');
            
            const streamsRequest = tx.objectStore('streams').getAll();
            const slidesRequest = tx.objectStore('slides').getAll();
            
            let streamsResult = null;
            let slidesResult = null;
            
            streamsRequest.onsuccess = () => {
                streamsResult = streamsRequest.result || [];
                checkComplete();
            };
            
            slidesRequest.onsuccess = () => {
                slidesResult = slidesRequest.result || [];
                checkComplete();
            };
            
            const checkComplete = () => {
                if (streamsResult !== null && slidesResult !== null) {
                    const totalSize = slidesResult.reduce((sum, slide) => sum + (slide.size || 0), 0);
                    const totalSlides = slidesResult.length;
                    
                    // 只统计有幻灯片的课程数量，与界面显示保持一致
                    const streamsWithSlides = new Set();
                    slidesResult.forEach(slide => {
                        if (slide.streamId) {
                            streamsWithSlides.add(slide.streamId);
                        }
                    });
                    const totalStreams = streamsWithSlides.size;
                    
                    resolve({
                        totalStreams,
                        totalSlides,
                        totalSize,
                        formattedSize: this.formatFileSize(totalSize)
                    });
                }
            };
            
            streamsRequest.onerror = () => {
                console.error('Failed to get streams for stats:', streamsRequest.error);
                reject(streamsRequest.error);
            };
            
            slidesRequest.onerror = () => {
                console.error('Failed to get slides for stats:', slidesRequest.error);
                reject(slidesRequest.error);
            };
        });
    }
    
    /**
     * 清空所有数据（包括IndexedDB和localStorage中的课程数据）
     */
    async clearAllData() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['streams', 'slides', 'thumbnails', 'sessions'], 'readwrite');

            let completedOperations = 0;
            const totalOperations = 4;

            const checkComplete = () => {
                completedOperations++;
                if (completedOperations === totalOperations) {
                    // IndexedDB清理完成后，清理localStorage中的课程缓存数据
                    this.clearLocalStorageCourseData();
                    resolve();
                }
            };

            // 清空所有表
            const clearStreams = tx.objectStore('streams').clear();
            clearStreams.onsuccess = checkComplete;
            clearStreams.onerror = () => reject(clearStreams.error);

            const clearSlides = tx.objectStore('slides').clear();
            clearSlides.onsuccess = checkComplete;
            clearSlides.onerror = () => reject(clearSlides.error);

            const clearThumbnails = tx.objectStore('thumbnails').clear();
            clearThumbnails.onsuccess = checkComplete;
            clearThumbnails.onerror = () => reject(clearThumbnails.error);

            const clearSessions = tx.objectStore('sessions').clear();
            clearSessions.onsuccess = checkComplete;
            clearSessions.onerror = () => reject(clearSessions.error);
        });
    }

    /**
     * 清理localStorage中的课程缓存数据，保留用户设置
     */
    clearLocalStorageCourseData() {
        try {
            // 需要保留的设置项
            const preservedKeys = ['language', 'hasVisited', 'yanhekt_token', 'auth'];
            const preservedData = {};

            // 保存需要保留的数据
            preservedKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    preservedData[key] = value;
                }
            });

            // 清理所有以 'stream_' 开头的课程缓存数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('stream_')) {
                    keysToRemove.push(key);
                }
            }

            // 删除课程缓存数据
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log('Removed localStorage course cache:', key);
            });

            // 恢复需要保留的设置
            Object.keys(preservedData).forEach(key => {
                localStorage.setItem(key, preservedData[key]);
            });

            console.log(`Cleared ${keysToRemove.length} course cache entries from localStorage, preserved ${Object.keys(preservedData).length} settings`);
        } catch (error) {
            console.error('Error clearing localStorage course data:', error);
        }
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 确保类在全局作用域中可用
window.SlideStorageManager = SlideStorageManager;
