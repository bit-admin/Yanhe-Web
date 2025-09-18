# Yanhe-Web 项目简介

本仓库用于存储 [RUC Student Portal](https://learn.ruc.edu.kg) 的前端代码。

RUC Student Portal 提供比延河课堂官方网站更简单直接的直播课程服务。用户可观看全校任意直播课程，同时在上课时同步从屏幕录制中提取课程课件。

> RUC Student Portal is a third-party tool developed independently by its contributors. It is NOT an official website of, and is NOT affiliated with, associated with, endorsed by, or in any way connected to Renmin University of China (RUC) or Beijing Institute of Technology (BIT), or any of their subsidiaries or affiliates. All product and company names are trademarks™ or registered® trademarks of their respective holders.

访问 [RUC IT Centre](https://it.ruc.edu.kg/software) 下载桌面版软件：

- [AutoSlides](https://github.com/bit-admin/Yanhekt-AutoSlides) 是一个自动从直播或录播课堂中捕获幻灯片的工具，支持监控内容变化并保存新幻灯片的截图。
- [Yanhekt Downloader](https://github.com/bit-admin/Yanhekt-downloader-electron) 是基于 Electron 的延河课堂视频下载器，可以将课程下载到本地。
- [AutoSlides Extractor](https://github.com/bit-admin/AutoSlides-extractor) 工具可以自动从下载好的视频中提取幻灯片，并将其保存为图片。

## 使用指南

### 从延河课堂获取密钥

我们非常重视您的账户安全。如果您完全信任本服务，可以直接通过 BIT 统一身份认证 (SSO) 登录。作为替代方案，如果您希望避免直接输入密码，可以先登录“延河课堂”官网，然后使用我们的书签工具提取访问密钥。在密钥有效期内，此操作只需执行一次。

> **提示：**
> - 在 iOS Safari 上，按住并拖动“获取延河课堂密钥”按钮，保持手指按住不放，用另一只手轻点屏幕底部的“书本”图标，在新打开的书签栏页面，将按钮拖放到你想要的位置；
> - 在桌面浏览器上，按下 Ctrl/Cmd+Shift+B 显示书签栏。

### 输入您的密钥

将从延河课堂复制的密钥粘贴到下面的输入框中。我们绝不会在服务器上储存您的账户、密码或任何个人身份信息。

### 观看直播课程

要查看您本学期注册的课程，请查看个人直播列表；要查看当前时段全校的直播课程，请切换到全校直播列表。您还可以输入关键词搜索想要观看的课程。

### 启用幻灯片自动提取

选择观看屏幕录制时，可启用幻灯片自动提取功能。在移动设备上启用此功能时，需保持浏览器标签页为活跃状态并置于前台。

> **提示：** 在 iOS Safari 上，切换应用、锁定屏幕可能导致幻灯片提取中止，您可以进入全屏或画中画播放模式并关闭自动锁屏。

### 管理您的已储存幻灯片

幻灯片会保存在您浏览器的本地数据库中，点击“查看已储存幻灯片”可进行管理。

> **提示：**
> - 若在直播页面下载失败，您可返回此处查看并下载所有已储存的幻灯片；
> - 若本地数据库出现索引错误，可尝试通过“清理所有数据”功能进行修复。

## 目录结构

```
.
├── _headers
├── css
│   ├── live.css
│   ├── main.css
│   └── slides.css
├── img
│   ├── logo.png
│   └── seal.png
├── index.html
├── js
│   ├── api.js
│   ├── app.js
│   ├── bookmark-generator.js
│   ├── config.js
│   ├── debug-mode.js
│   ├── device-optimizer.js
│   ├── i18n.js
│   ├── live.js
│   ├── slide-extractor.js
│   ├── slide-storage-manager.js
│   ├── slides.js
│   └── token.js
├── legal.md
├── LICENSE
├── live.html
├── README.md
├── robots.txt
└── slides.html
```

## TERMS AND CONDITIONS

**Last Updated:** August 5, 2025

By downloading, installing, or using this software ("Software"), you ("User") signify your agreement to be legally bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you are not permitted to install or use the Software.

### 1. Definitions

**"Software"** refers to the software application provided by the Developer designed to interact with the Platform.

**"Platform"** refers to the "Yanhe Classroom" platform of the Beijing Institute of Technology ("BIT").

**"Content"** refers to all course resources available on the Platform, including but not limited to videos, documents, images, and audio files.

**"Developer"** refers to the creator and owner of the Software.

### 2. Permitted Use and Scope of Service

The Software is a technical tool designed exclusively to facilitate the download of Content from the Platform. The User's right to use the Software is contingent upon the User having the necessary legal rights and permissions from BIT and/or the relevant rights holders to access and download such Content.

The Software acts solely as a technical intermediary. It does not store, modify, host, or distribute any Content. All downloaded materials originate directly from the Platform's servers at the User's explicit direction.

### 3. Intellectual Property Rights

The User acknowledges and agrees that all right, title, and interest in and to the Content are the intellectual property of their original authors, BIT, or respective rights holders. The Developer claims no ownership or rights to the Content and assumes no liability for the IP status of any material on the Platform. The User is solely responsible for complying with the Platform's terms of service, intellectual property policies, and all applicable international and domestic copyright laws.

### 4. User Obligations and Prohibited Conduct

The User agrees not to use the Software for any purpose that is unlawful or prohibited by these Terms. The User is solely responsible for their conduct and any Content they download. Prohibited activities include, but are not limited to:

a. Reproducing, distributing, publicly performing, modifying, or creating derivative works from any Content without explicit authorization from the rightful owner;

b. Using the Content for any commercial purpose;

c. Reverse-engineering, decompiling, or attempting to discover the source code of the Software or the Platform;

d. Using the Software to infringe upon the intellectual property rights or other legal rights of any third party, including BIT, content creators, or other rights holders.

Any breach of these obligations may result in the termination of the User's right to use the Software and may expose the User to civil and/or criminal liability. The User agrees that they bear sole legal responsibility for any disputes arising from their use of the Software.

### 5. Disclaimer of Warranties

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE IS PROVIDED **"AS IS"** AND **"AS AVAILABLE"**, WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. THE DEVELOPER EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

THE DEVELOPER DOES NOT WARRANT THAT THE SOFTWARE WILL MEET THE USER'S REQUIREMENTS, BE UNINTERRUPTED, OR BE ERROR-FREE, NOR DOES THE DEVELOPER MAKE ANY WARRANTY AS TO THE LEGALITY, ACCURACY, OR AVAILABILITY OF THE PLATFORM OR ITS CONTENT.

### 6. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING WITHOUT LIMITATION, DAMAGES FOR LOSS OF DATA, LOSS OF PROFITS, BUSINESS INTERRUPTION, INTELLECTUAL PROPERTY DISPUTES, OR ANY OTHER COMMERCIAL DAMAGES OR LOSSES, ARISING OUT OF OR IN ANY WAY RELATED TO THE USE OR INABILITY TO USE THE SOFTWARE, HOWEVER CAUSED, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, OR OTHERWISE) AND EVEN IF THE DEVELOPER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

### 7. Indemnification

The User agrees to indemnify, defend, and hold harmless the Developer and its affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with the User's: (a) access to or use of the Software; (b) violation of these Terms; or (c) violation of any third-party right, including any intellectual property right.

### 8. General Provisions


**Governing Law:** These Terms shall be governed by and construed in accordance with the laws of Kyrgyz Republic, without regard to its conflict of law principles.

**Severability:** If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.

**Entire Agreement:** These Terms constitute the entire agreement between the User and the Developer regarding the use of the Software and supersede all prior agreements and understandings.

**Contact Information:** Razzakov University College and Bishkek Institute of Technology are higher education institutions registered in the Kyrgyz Republic.​ For technical or legal inquiries, please contact info@ruc.edu.kg.