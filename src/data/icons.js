// 常用图标库 - 包含关键词用于AI匹配
export const iconLibrary = [
  // 导航类
  { id: 'menu', name: '菜单', category: 'navigation', keywords: 'hamburger menu navigation toggle bars 导航 菜单 汉堡', path: 'M3 12h18M3 6h18M3 18h18' },
  { id: 'arrow-left', name: '返回', category: 'navigation', keywords: 'back previous return navigate 左返回 上一步', path: 'M19 12H5M12 19l-7-7 7-7' },
  { id: 'arrow-right', name: '前进', category: 'navigation', keywords: 'next forward continue 右前进 下一步', path: 'M5 12h14M12 5l7 7-7 7' },
  { id: 'arrow-up', name: '向上', category: 'navigation', keywords: 'up top 向上 上', path: 'M12 19V5M5 12l7-7 7 7' },
  { id: 'arrow-down', name: '向下', category: 'navigation', keywords: 'down bottom 向下 下', path: 'M12 5v14M19 12l-7 7-7-7' },
  { id: 'chevron-down', name: '下拉', category: 'navigation', keywords: 'dropdown expand accordion select 下拉 展开', path: 'M6 9l6 6 6-6' },
  { id: 'chevron-up', name: '收起', category: 'navigation', keywords: 'collapse close accordion minimize 收起 折叠', path: 'M18 15l-6-6-6 6' },
  { id: 'chevron-left', name: '左切换', category: 'navigation', keywords: 'left prev chevron 左切换', path: 'M15 18l-6-6 6-6' },
  { id: 'chevron-right', name: '右切换', category: 'navigation', keywords: 'right next chevron 右切换', path: 'M9 18l6-6-6-6' },
  { id: 'home', name: '首页', category: 'navigation', keywords: 'homepage main dashboard start 首页 主页', path: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10' },
  { id: 'x', name: '关闭', category: 'navigation', keywords: 'close cancel dismiss remove exit 关闭 取消 退出', path: 'M18 6L6 18M6 6l12 12' },
  { id: 'external-link', name: '外链', category: 'navigation', keywords: 'open new tab external link 外链 外部链接', path: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3' },

  // 操作类
  { id: 'plus', name: '添加', category: 'action', keywords: 'add create new insert 加 添加 创建', path: 'M12 5v14M5 12h14' },
  { id: 'minus', name: '减少', category: 'action', keywords: 'remove subtract decrease delete 减 删除', path: 'M5 12h14' },
  { id: 'check', name: '勾选', category: 'action', keywords: 'success done complete verified 勾 成功 完成', path: 'M20 6L9 17l-5-5' },
  { id: 'x-circle', name: '取消', category: 'action', keywords: 'error failed cancel rejected 取消 错误', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM15 9l-6 6M9 9l6 6' },
  { id: 'search', name: '搜索', category: 'action', keywords: 'find lookup filter query search 搜索 查找', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35' },
  { id: 'edit', name: '编辑', category: 'action', keywords: 'pencil modify change update 编辑 修改', path: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' },
  { id: 'trash', name: '删除', category: 'action', keywords: 'delete remove discard bin 删除 垃圾桶', path: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6' },
  { id: 'copy', name: '复制', category: 'action', keywords: 'duplicate clipboard paste 复制 粘贴', path: 'M20 9h-4a2 2 0 00-2 2v4m4-6H8a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V11a2 2 0 00-2-2h-4' },
  { id: 'save', name: '保存', category: 'action', keywords: 'disk store persist save 保存 存储', path: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8' },
  { id: 'download', name: '下载', category: 'action', keywords: 'export save file download 下载 导出', path: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { id: 'upload', name: '上传', category: 'action', keywords: 'import file attach upload 上传 导入', path: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { id: 'link', name: '链接', category: 'action', keywords: 'url hyperlink chain connect 链接 关联', path: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' },
  { id: 'share', name: '分享', category: 'action', keywords: 'social distribute send 分享 发送', path: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13' },
  { id: 'settings', name: '设置', category: 'action', keywords: 'gear cog preferences config settings 设置 齿轮', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'filter', name: '筛选', category: 'action', keywords: 'sort refine narrow options 筛选 过滤', path: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z' },
  { id: 'refresh-cw', name: '刷新', category: 'action', keywords: 'reload sync update refresh 刷新 同步', path: 'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15' },
  { id: 'eye', name: '显示', category: 'action', keywords: 'view show visible 显示 可见', path: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z' },
  { id: 'eye-off', name: '隐藏', category: 'action', keywords: 'hide invisible password hidden 隐藏 不可见', path: 'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22' },
  { id: 'lock', name: '锁定', category: 'action', keywords: 'secure password protected private 锁 安全', path: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4' },
  { id: 'unlock', name: '解锁', category: 'action', keywords: 'open access unsecure public 解锁', path: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1' },
  { id: 'zoom-in', name: '放大', category: 'action', keywords: 'magnify increase enlarge 放大 放大镜', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35M11 8v6M8 11h6' },
  { id: 'zoom-out', name: '缩小', category: 'action', keywords: 'reduce shrink diminish 缩小', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35M8 11h6' },

  // 状态类
  { id: 'check-circle', name: '成功', category: 'status', keywords: 'success done complete verified 成功 完成', path: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },
  { id: 'alert-circle', name: '提示', category: 'status', keywords: 'info notice information help 提示 信息', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01' },
  { id: 'alert-triangle', name: '警告', category: 'status', keywords: 'warning caution attention danger 警告 注意', path: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01' },
  { id: 'loader', name: '加载', category: 'status', keywords: 'loading spinner processing wait 加载 转圈', path: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' },
  { id: 'clock', name: '时间', category: 'status', keywords: 'time schedule pending wait 时间 钟', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },

  // 通讯类
  { id: 'mail', name: '邮件', category: 'communication', keywords: 'email message inbox letter 邮件 信', path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
  { id: 'message-circle', name: '聊天', category: 'communication', keywords: 'chat comment bubble conversation 聊天 对话', path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
  { id: 'phone', name: '电话', category: 'communication', keywords: 'call mobile telephone contact 电话', path: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' },
  { id: 'send', name: '发送', category: 'communication', keywords: 'submit dispatch message airplane 发送', path: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { id: 'bell', name: '通知', category: 'communication', keywords: 'notification alert ring reminder 通知 铃铛', path: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },

  // 用户类
  { id: 'user', name: '用户', category: 'user', keywords: 'profile account person avatar 用户 头像', path: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'users', name: '用户组', category: 'user', keywords: 'team group people members 用户组 团队', path: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'user-plus', name: '添加用户', category: 'user', keywords: 'add invite new member 添加用户', path: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6' },
  { id: 'log-in', name: '登录', category: 'user', keywords: 'signin authenticate enter 登录', path: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3' },
  { id: 'log-out', name: '退出', category: 'user', keywords: 'signout exit leave logout 退出 登出', path: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9' },

  // 媒体类
  { id: 'image', name: '图片', category: 'media', keywords: 'photo picture gallery thumbnail 图片 照片', path: 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21' },
  { id: 'camera', name: '相机', category: 'media', keywords: 'photo capture snapshot picture 相机 拍照', path: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 13a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'video', name: '视频', category: 'media', keywords: 'movie film play record 视频 录像', path: 'M23 7l-7 5 7 5V7zM16 5H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2z' },
  { id: 'play', name: '播放', category: 'media', keywords: 'start video audio media 播放', path: 'M5 3l14 9-14 9V3z' },
  { id: 'pause', name: '暂停', category: 'media', keywords: 'stop halt video audio 暂停', path: 'M6 4h4v16H6zM14 4h4v16h-4z' },
  { id: 'volume-2', name: '音量', category: 'media', keywords: 'sound audio speaker music 音量 声音', path: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07' },
  { id: 'volume-x', name: '静音', category: 'media', keywords: 'mute silent audio off 静音', path: 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6' },
  { id: 'mic', name: '麦克风', category: 'media', keywords: 'microphone record voice audio 麦克风 录音', path: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8' },

  // 商业类
  { id: 'shopping-cart', name: '购物车', category: 'commerce', keywords: 'cart checkout basket buy 购物车', path: 'M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6M9 22a1 1 0 100-2 1 1 0 000 2zM20 22a1 1 0 100-2 1 1 0 000 2z' },
  { id: 'credit-card', name: '支付', category: 'commerce', keywords: 'payment card checkout stripe 支付 银行卡', path: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22' },
  { id: 'tag', name: '标签', category: 'commerce', keywords: 'label price discount sale 标签 价格', path: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01' },
  { id: 'gift', name: '礼物', category: 'commerce', keywords: 'present reward bonus offer 礼物 奖励', path: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z' },
  { id: 'percent', name: '折扣', category: 'commerce', keywords: 'discount sale offer promo 折扣 百分号', path: 'M19 5L5 19M6.5 6.5l11 11M17.5 6.5l-11 11' },

  // 数据类
  { id: 'bar-chart', name: '柱状图', category: 'data', keywords: 'analytics statistics graph metrics 图表 统计', path: 'M12 20V10M18 20V4M6 20v-4' },
  { id: 'pie-chart', name: '饼图', category: 'data', keywords: 'statistics distribution breakdown 饼图', path: 'M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z' },
  { id: 'trending-up', name: '上升', category: 'data', keywords: 'growth increase positive trend 上升 增长', path: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
  { id: 'trending-down', name: '下降', category: 'data', keywords: 'decline decrease negative trend 下降', path: 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6' },
  { id: 'activity', name: '活动', category: 'data', keywords: 'pulse heartbeat monitor live 活动 脉冲', path: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id: 'database', name: '数据库', category: 'data', keywords: 'storage server data backend 数据库', path: 'M12 2C6.48 2 2 4.69 2 8v8c0 3.31 4.48 6 10 6s10-2.69 10-6V8c0-3.31-4.48-6-10-6zM12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z' },

  // 文件类
  { id: 'file', name: '文件', category: 'file', keywords: 'document page paper doc 文件', path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6' },
  { id: 'file-text', name: '文档', category: 'file', keywords: 'document text page article 文档 文章', path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { id: 'folder', name: '文件夹', category: 'file', keywords: 'directory organize group files 文件夹', path: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z' },
  { id: 'folder-open', name: '打开文件夹', category: 'file', keywords: 'expanded browse files view 打开文件夹', path: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v2M2 10h20' },
  { id: 'paperclip', name: '附件', category: 'file', keywords: 'attachment attach file link 附件', path: 'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48' },
  { id: 'clipboard', name: '剪贴板', category: 'file', keywords: 'paste copy buffer notes 剪贴板', path: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z' },

  // 布局类
  { id: 'grid', name: '网格', category: 'layout', keywords: 'tiles gallery layout dashboard 网格 宫格', path: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { id: 'list', name: '列表', category: 'layout', keywords: 'rows table lines items 列表', path: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'layers', name: '图层', category: 'layout', keywords: 'stack layers depth z-index 图层', path: 'M12 2L2 7l8 5 8-5-8-5zM2 17l8 5 8-5M2 12l8 5 8-5' },
  { id: 'maximize', name: '最大化', category: 'layout', keywords: 'fullscreen expand enlarge zoom 全屏 最大化', path: 'M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3' },
  { id: 'minimize', name: '最小化', category: 'layout', keywords: 'reduce shrink collapse 最小化', path: 'M8 3v3a2 2 0 01-2 2H3m18 0h-3v3a2 2 0 01-2 2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3' },

  // 社交类
  { id: 'heart', name: '喜欢', category: 'social', keywords: 'like love favorite wishlist 心 喜欢', path: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' },
  { id: 'star', name: '收藏', category: 'social', keywords: 'rating review favorite bookmark 星 收藏', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'thumbs-up', name: '点赞', category: 'social', keywords: 'like approve agree positive 点赞', path: 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3' },
  { id: 'bookmark', name: '书签', category: 'social', keywords: 'save later favorite mark 书签', path: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z' },
  { id: 'flag', name: '举报', category: 'social', keywords: 'report mark important highlight 举报 标记', path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },

  // 设备类
  { id: 'smartphone', name: '手机', category: 'device', keywords: 'mobile phone device touch 手机 移动', path: 'M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01' },
  { id: 'tablet', name: '平板', category: 'device', keywords: 'ipad device touch screen 平板', path: 'M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2z' },
  { id: 'monitor', name: '显示器', category: 'device', keywords: 'desktop screen computer display 显示器 电脑', path: 'M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4' },
  { id: 'laptop', name: '笔记本', category: 'device', keywords: 'notebook computer portable device 笔记本', path: 'M20 16V7a2 2 0 00-2-2H6a2 2 0 00-2 2v9m16 0H4m16 0l1.28 2.55a1 1 0 01-.9 1.45H3.62a1 1 0 01-.9-1.45L4 16' },
  { id: 'gamepad', name: '游戏', category: 'device', keywords: 'gamepad gaming controller 游戏 游戏手柄', path: 'M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 9h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5a1 1 0 011-1zM9 12h6' },

  // 安全类
  { id: 'shield', name: '安全', category: 'security', keywords: 'protection security safe guard 安全 盾牌', path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id: 'key', name: '密钥', category: 'security', keywords: 'password access unlock login 密钥 钥匙', path: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' },

  // 位置类
  { id: 'map-pin', name: '位置', category: 'location', keywords: 'location marker place address 位置 地图', path: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z' },
  { id: 'map', name: '地图', category: 'location', keywords: 'directions navigate geography location 地图', path: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16' },
  { id: 'navigation', name: '导航', category: 'location', keywords: 'compass direction pointer arrow 导航', path: 'M3 11l19-9-9 19-10-10z' },
  { id: 'globe', name: '地球', category: 'location', keywords: 'world international global web 地球 世界', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z' },

  // 开发类
  { id: 'code', name: '代码', category: 'development', keywords: 'develop programming syntax html 代码', path: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
  { id: 'terminal', name: '终端', category: 'development', keywords: 'console cli command shell 终端', path: 'M4 17l6-6-6-6M12 19h8' },
  { id: 'git-branch', name: '分支', category: 'development', keywords: 'version control branch merge 分支', path: 'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9' },
  { id: 'github', name: 'GitHub', category: 'development', keywords: 'repository code open source GitHub', path: 'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.097-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.842-2.339 4.687-4.566 4.935.359.307.679.917.679 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z' },

  // 箭头类
  { id: 'refresh', name: '刷新', category: 'arrows', keywords: 'reload sync update refresh 刷新', path: 'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15' },
  { id: 'rotate-ccw', name: '撤销', category: 'arrows', keywords: 'undo back revert history 撤销', path: 'M1 4v6h6M3.51 15a9 9 0 102.13-9.36L1 10' },
  { id: 'rotate-cw', name: '重做', category: 'arrows', keywords: 'redo forward repeat history 重做', path: 'M23 4v6h-6M20.49 15a9 9 0 11-2.12-9.36L23 10' },

  // 界面元素
  { id: 'calendar', name: '日历', category: 'ui', keywords: 'date schedule event appointment 日历', path: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18' },

  // 形状类
  { id: 'square', name: '正方形', category: 'shapes', keywords: 'square box 正方形', path: 'M3 3h18v18H3z' },
  { id: 'circle', name: '圆形', category: 'shapes', keywords: 'circle round dot 圆形', path: 'M12 2a10 10 0 100 20 10 10 0 000-20z' },
  { id: 'triangle', name: '三角形', category: 'shapes', keywords: 'triangle 三角形', path: 'M12 2L2 22h20L12 2z' },
  { id: 'hexagon', name: '六边形', category: 'shapes', keywords: 'hexagon 六边形', path: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },

  // 编辑类
  { id: 'bold', name: '粗体', category: 'editor', keywords: 'bold text format 粗体', path: 'M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z' },
  { id: 'italic', name: '斜体', category: 'editor', keywords: 'italic text format 斜体', path: 'M19 4h-9M14 20H5M15 4L9 20' },
  { id: 'underline', name: '下划线', category: 'editor', keywords: 'underline text format 下划线', path: 'M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16' },
  { id: 'align-left', name: '左对齐', category: 'editor', keywords: 'align left text 左对齐', path: 'M17 10H3M21 6H3M21 14H3M17 18H3' },
  { id: 'align-center', name: '居中', category: 'editor', keywords: 'align center text 居中', path: 'M18 10H6M21 6H3M21 14H3M18 18H6' },
  { id: 'align-right', name: '右对齐', category: 'editor', keywords: 'align right text 右对齐', path: 'M21 10H7M21 6H3M21 14H3M21 18H7' },
];

// 图标分类
export const iconCategories = {
  navigation: '导航',
  action: '操作',
  status: '状态',
  communication: '通讯',
  user: '用户',
  media: '媒体',
  commerce: '商业',
  data: '数据',
  file: '文件',
  layout: '布局',
  social: '社交',
  device: '设备',
  security: '安全',
  location: '位置',
  development: '开发',
  arrows: '箭头',
  ui: '界面',
  shapes: '形状',
  editor: '编辑',
};

// 获取所有分类
export const getCategories = () => {
  const categories = new Set(iconLibrary.map(icon => icon.category));
  return Array.from(categories);
};

// 按分类获取图标
export const getIconsByCategory = (category) => {
  return iconLibrary.filter(icon => icon.category === category);
};

/**
 * 搜索匹配图标 - 基于关键词
 * @param {string} query - 搜索关键词（中文/英文）
 * @param {number} limit - 返回数量限制
 * @returns {Array} 匹配度最高的图标列表
 */
export const searchIcons = (query, limit = 5) => {
  if (!query || query.trim() === '') return [];

  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/);

  // 计算匹配分数
  const scored = iconLibrary.map(icon => {
    const nameLower = icon.name.toLowerCase();
    const keywordsLower = (icon.keywords || '').toLowerCase();
    const categoryLower = icon.category.toLowerCase();
    const idLower = icon.id.toLowerCase();

    let score = 0;

    for (const word of queryWords) {
      // 精确匹配名称
      if (nameLower === word) score += 100;
      // 名称包含
      else if (nameLower.includes(word)) score += 50;
      // ID匹配
      else if (idLower.includes(word)) score += 40;
      // 分类匹配
      else if (categoryLower.includes(word)) score += 30;
      // 关键词匹配
      else if (keywordsLower.includes(word)) score += 20;
    }

    return { icon, score };
  });

  // 过滤并排序
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.icon);
};

/**
 * 获取图标库统计信息
 */
export const getIconStats = () => {
  const categories = {};
  iconLibrary.forEach(icon => {
    categories[icon.category] = (categories[icon.category] || 0) + 1;
  });
  return {
    total: iconLibrary.length,
    categories,
  };
};
