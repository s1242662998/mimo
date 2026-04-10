export const exportToPNG = (stage, layer) => {
  if (!stage || !layer) return;

  // 获取该层所有子节点的包围盒
  const box = layer.getClientRect();

  // 如果画布上没有东西或者计算错误
  if (box.width === 0 || box.height === 0) {
    alert("画布为空，无法导出");
    return;
  }

  // 增加一些内边距(Padding)让导出的图片不至于太贴边
  const padding = 20;

  const dataURL = stage.toDataURL({
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
    pixelRatio: 2, 
    mimeType: 'image/png' 
  });

  const link = document.createElement('a');
  link.download = 'prototype-export.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportProject = (pages, variables) => {
  const data = {
    version: '1.0.0',
    timestamp: Date.now(),
    pages,
    variables
  };
  
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  // 使用专属扩展名 .mimo
  link.download = `project-${new Date().toISOString().slice(0,10)}.mimo`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importProject = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);
        
        // 简单验证数据格式
        if (!data.pages || !Array.isArray(data.pages)) {
          throw new Error('Invalid project file format');
        }
        
        resolve({
          pages: data.pages,
          variables: data.variables || {}
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};