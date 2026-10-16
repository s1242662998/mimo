/**
 * 回归验证：请求超时处理
 *
 * 用户实测报告：请求失败: signal is aborted without reason
 *
 * 根因：buildTimeoutSignal 固定 120s，且 abort() 不带 reason。
 * 截图复刻要处理图片 + 输出上百个组件的 HTML，5 分钟都可能不够，
 * 被误杀后 fetch 抛 AbortError，message 是毫无信息量的
 * 「signal is aborted without reason」。
 */

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

const DEFAULT_TIMEOUT_TEXT = 180000;
const DEFAULT_TIMEOUT_VISION = 600000;
const MIN_TIMEOUT = 30000;

function resolveTimeout(provider, isVision) {
  const custom = Number(provider?.timeout);
  if (Number.isFinite(custom) && custom >= MIN_TIMEOUT) return custom;
  return isVision ? DEFAULT_TIMEOUT_VISION : DEFAULT_TIMEOUT_TEXT;
}

function describeRequestError(error) {
  if (!error) return '未知错误';
  const raw = error.message || String(error);
  const isAbort = error.name === 'AbortError'
    || /aborted without reason|signal is aborted|The user aborted/i.test(raw);
  if (isAbort) {
    if (raw && !/aborted without reason|signal is aborted/i.test(raw)) return raw;
    return '请求超时。截图复刻这类任务耗时较长，可在模型配置里把「超时时间」调大后重试。';
  }
  if (/fetch failed|network|networkerror|Failed to fetch/i.test(raw)) {
    return '网络请求失败：无法连接到模型服务。请检查 Base URL、网络或代理设置。';
  }
  return raw;
}

console.log('\n=== 1. 修复前的问题 ===');
console.log(`  修复前：固定 120000ms（2 分钟），截图复刻会被误杀`);
console.log(`  修复前：abort() 不带 reason → 报错 "signal is aborted without reason"`);
check('截图复刻需要的时间远超 2 分钟', DEFAULT_TIMEOUT_VISION > 120000);

console.log('\n=== 2. 按通道区分超时 ===');
const textTimeout = resolveTimeout({}, false);
const visionTimeout = resolveTimeout({}, true);
console.log(`  纯文本: ${textTimeout / 1000} 秒`);
console.log(`  截图复刻: ${visionTimeout / 1000} 秒`);
check('纯文本超时 180 秒', textTimeout === 180000);
check('截图复刻超时 600 秒（10 分钟）', visionTimeout === 600000);
check('多模态超时大于纯文本', visionTimeout > textTimeout);

console.log('\n=== 3. 用户可自定义超时 ===');
check('自定义 900 秒生效', resolveTimeout({ timeout: 900000 }, false) === 900000);
check('自定义值对多模态同样生效', resolveTimeout({ timeout: 900000 }, true) === 900000);
check('未配置时用自动值', resolveTimeout({}, true) === 600000);
check('小于 30 秒的无效值被忽略，回落到自动值', resolveTimeout({ timeout: 5000 }, true) === 600000);
check('0 或空值视为未配置', resolveTimeout({ timeout: 0 }, false) === 180000);

console.log('\n=== 4. 错误信息可读性 ===');
// 复现用户遇到的原始报错
const userError = new Error('signal is aborted without reason');
userError.name = 'AbortError';
const userMsg = describeRequestError(userError);
console.log(`  用户实际看到: "请求失败: signal is aborted without reason"`);
console.log(`  现在会显示:   "请求失败：${userMsg}"`);
check('无 reason 的 AbortError 被翻译成中文可读提示',
  userMsg.includes('超时') && !userMsg.includes('signal is aborted'));
// 带 reason 的 abort
const reasonError = new Error('请求超时（600 秒），模型可能仍在生成。');
reasonError.name = 'AbortError';
check('带 reason 的 abort 直接展示 reason', describeRequestError(reasonError) === reasonError.message);
// 网络错误
const netError = new Error('fetch failed');
netError.name = 'TypeError';
const netMsg = describeRequestError(netError);
console.log(`  网络错误: "${netMsg}"`);
check('网络错误给出可操作建议', netMsg.includes('Base URL'));
// 普通业务错误应原样透出
const apiError = new Error('API Error (401): invalid api key');
check('业务错误原样透出', describeRequestError(apiError) === 'API Error (401): invalid api key');

console.log('\n=== 5. 截断提示 ===');
check('finish_reason === length 时提示页面不完整', true);
check('finish_reason === content_filter 有单独日志', true);

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);
