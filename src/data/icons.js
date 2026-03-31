// 常用图标库
export const iconLibrary = [
  // 箭头类
  { id: 'arrow-up', name: '向上箭头', category: 'arrows', path: 'M12 19V5M5 12l7-7 7 7' },
  { id: 'arrow-down', name: '向下箭头', category: 'arrows', path: 'M12 5v14M19 12l-7 7-7-7' },
  { id: 'arrow-left', name: '向左箭头', category: 'arrows', path: 'M19 12H5M12 19l-7-7 7-7' },
  { id: 'arrow-right', name: '向右箭头', category: 'arrows', path: 'M5 12h14M12 5l7 7-7 7' },
  { id: 'chevron-up', name: '上箭头', category: 'arrows', path: 'M18 15l-6-6-6 6' },
  { id: 'chevron-down', name: '下箭头', category: 'arrows', path: 'M6 9l6 6 6-6' },
  { id: 'chevron-left', name: '左箭头', category: 'arrows', path: 'M15 18l-6-6 6-6' },
  { id: 'chevron-right', name: '右箭头', category: 'arrows', path: 'M9 18l6-6-6-6' },
  { id: 'refresh', name: '刷新', category: 'arrows', path: 'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15' },

  // 操作类
  { id: 'plus', name: '加号', category: 'actions', path: 'M12 5v14M5 12h14' },
  { id: 'minus', name: '减号', category: 'actions', path: 'M5 12h14' },
  { id: 'check', name: '勾选', category: 'actions', path: 'M20 6L9 17l-5-5' },
  { id: 'x', name: '关闭', category: 'actions', path: 'M18 6L6 18M6 6l12 12' },
  { id: 'search', name: '搜索', category: 'actions', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35' },
  { id: 'edit', name: '编辑', category: 'actions', path: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' },
  { id: 'trash', name: '删除', category: 'actions', path: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6' },
  { id: 'copy', name: '复制', category: 'actions', path: 'M20 9h-4a2 2 0 00-2 2v4m4-6H8a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V11a2 2 0 00-2-2h-4' },
  { id: 'save', name: '保存', category: 'actions', path: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8' },
  { id: 'download', name: '下载', category: 'actions', path: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { id: 'upload', name: '上传', category: 'actions', path: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { id: 'link', name: '链接', category: 'actions', path: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' },
  { id: 'unlink', name: '取消链接', category: 'actions', path: 'M18.36 6.64a9 9 0 11-12.73 0M12 2v10' },
  { id: 'zoom-in', name: '放大', category: 'actions', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35M11 8v6M8 11h6' },
  { id: 'zoom-out', name: '缩小', category: 'actions', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10-2l-4.35-4.35M8 11h6' },
  { id: 'eye', name: '显示', category: 'actions', path: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z' },
  { id: 'eye-off', name: '隐藏', category: 'actions', path: 'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22' },
  { id: 'lock', name: '锁定', category: 'actions', path: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4' },
  { id: 'unlock', name: '解锁', category: 'actions', path: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1' },

  // 界面元素
  { id: 'home', name: '首页', category: 'ui', path: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10' },
  { id: 'menu', name: '菜单', category: 'ui', path: 'M3 12h18M3 6h18M3 18h18' },
  { id: 'settings', name: '设置', category: 'ui', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'bell', name: '通知', category: 'ui', path: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },
  { id: 'user', name: '用户', category: 'ui', path: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'users', name: '用户组', category: 'ui', path: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'calendar', name: '日历', category: 'ui', path: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18' },
  { id: 'clock', name: '时钟', category: 'ui', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },
  { id: 'star', name: '星标', category: 'ui', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'heart', name: '喜欢', category: 'ui', path: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' },
  { id: 'flag', name: '旗帜', category: 'ui', path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
  { id: 'bookmark', name: '书签', category: 'ui', path: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z' },
  { id: 'filter', name: '筛选', category: 'ui', path: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z' },
  { id: 'layers', name: '图层', category: 'ui', path: 'M12 2L2 7l8 5 8-5-8-5zM2 17l8 5 8-5M2 12l8 5 8-5' },
  { id: 'grid', name: '网格', category: 'ui', path: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { id: 'list', name: '列表', category: 'ui', path: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },

  // 媒体类
  { id: 'image', name: '图片', category: 'media', path: 'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21' },
  { id: 'camera', name: '相机', category: 'media', path: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 13a4 4 0 100-8 4 4 0 000 8z' },
  { id: 'video', name: '视频', category: 'media', path: 'M23 7l-7 5 7 5V7zM16 5H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2z' },
  { id: 'music', name: '音乐', category: 'media', path: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'volume', name: '音量', category: 'media', path: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07' },
  { id: 'volume-off', name: '静音', category: 'media', path: 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6' },
  { id: 'play', name: '播放', category: 'media', path: 'M5 3l14 9-14 9V3z' },
  { id: 'pause', name: '暂停', category: 'media', path: 'M6 4h4v16H6zM14 4h4v16h-4z' },

  // 通讯类
  { id: 'mail', name: '邮件', category: 'communication', path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
  { id: 'phone', name: '电话', category: 'communication', path: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' },
  { id: 'message', name: '消息', category: 'communication', path: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z' },
  { id: 'send', name: '发送', category: 'communication', path: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { id: 'share', name: '分享', category: 'communication', path: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13' },

  // 文件类
  { id: 'file', name: '文件', category: 'files', path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { id: 'folder', name: '文件夹', category: 'files', path: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z' },
  { id: 'file-text', name: '文档', category: 'files', path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8' },

  // 形状类
  { id: 'square', name: '正方形', category: 'shapes', path: 'M3 3h18v18H3z' },
  { id: 'circle', name: '圆形', category: 'shapes', path: 'M12 2a10 10 0 100 20 10 10 0 000-20z' },
  { id: 'triangle', name: '三角形', category: 'shapes', path: 'M12 2L2 22h20L12 2z' },
  { id: 'hexagon', name: '六边形', category: 'shapes', path: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },

  // 符号类
  { id: 'info', name: '信息', category: 'symbols', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01' },
  { id: 'help', name: '帮助', category: 'symbols', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01' },
  { id: 'warning', name: '警告', category: 'symbols', path: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01' },
  { id: 'error', name: '错误', category: 'symbols', path: 'M12 2a10 10 0 100 20 10 10 0 000-20zM15 9l-6 6M9 9l6 6' },
  { id: 'check-circle', name: '成功', category: 'symbols', path: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3' },

  // 编辑类
  { id: 'bold', name: '粗体', category: 'editor', path: 'M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z' },
  { id: 'italic', name: '斜体', category: 'editor', path: 'M19 4h-9M14 20H5M15 4L9 20' },
  { id: 'underline', name: '下划线', category: 'editor', path: 'M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16' },
  { id: 'align-left', name: '左对齐', category: 'editor', path: 'M17 10H3M21 6H3M21 14H3M17 18H3' },
  { id: 'align-center', name: '居中对齐', category: 'editor', path: 'M18 10H6M21 6H3M21 14H3M18 18H6' },
  { id: 'align-right', name: '右对齐', category: 'editor', path: 'M21 10H7M21 6H3M21 14H3M21 18H7' },
];

// 图标分类
export const iconCategories = {
  arrows: '箭头',
  actions: '操作',
  ui: '界面',
  media: '媒体',
  communication: '通讯',
  files: '文件',
  shapes: '形状',
  symbols: '符号',
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
