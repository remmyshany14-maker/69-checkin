const domain = "https://69yun69.com";

const user = process.env.USER_EMAIL;
const pass = process.env.USER_PASSWORD;

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const toEmail = process.env.TO_EMAIL;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMail(subject, text) {
  if (!smtpUser || !smtpPass || !toEmail) {
    console.log("未配置邮件通知");
    return;
  }

  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    service: "qq",
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.sendMail({
    from: smtpUser,
    to: toEmail,
    subject,
    text
  });

  console.log("邮件发送成功");
}

async function checkin() {
  console.log("开始签到");

  // 登录
  const loginResponse = await fetch(`${domain}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest"
    },
    body:
      `email=${encodeURIComponent(user)}` +
      `&passwd=${encodeURIComponent(pass)}` +
      `&remember_me=on&code=`
  });

  const loginJson = await loginResponse.json();

  console.log("登录结果:", loginJson);

  if (loginJson.ret !== 1) {
    throw new Error("登录失败");
  }

  // 获取 cookie
  const rawCookies = loginResponse.headers.get("set-cookie");

  if (!rawCookies) {
    throw new Error("获取 Cookie 失败");
  }

  const cookies = rawCookies
    .split(/,(?=\s\w+=)/)
    .map(c => c.split(";")[0])
    .join("; ");

  // 签到
  const checkinResponse = await fetch(`${domain}/user/checkin`, {
    method: "POST",
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  const result = await checkinResponse.json();

  console.log("签到结果:", result);

  const msg = result.msg || "无返回内容";
  const isSuccess = result.ret === 1;

  const emailText = `
📌 69云签到结果

状态：${isSuccess ? "✅ 成功" : "⚠️ 失败/已签到"}

------------------------
${msg}
------------------------

⏰ 时间：${new Date().toLocaleString()}
`;

  await sendMail("69云签到结果", emailText);

  return result;
}

async function retryCheckin() {
  const maxRetry = 3;
  let lastError = null;
  let lastResult = null;

  for (let i = 1; i <= maxRetry; i++) {
    try {
      console.log(`第 ${i} 次尝试`);
      lastResult = await checkin();
      return;
    } catch (err) {
      console.log(`失败: ${err.message}`);
      lastError = err;

      if (i < maxRetry) {
        await sleep(5000);
      }
    }
  }

  // 最终失败才发邮件
  const emailText = `
📌 69云签到结果（最终失败）

❌ 已重试 ${maxRetry} 次仍失败

错误信息：
${lastError?.message || "未知错误"}

返回数据：
${JSON.stringify(lastResult, null, 2)}

⏰ 时间：${new Date().toLocaleString()}
`;

  await sendMail("69云签到失败", emailText);

  throw lastError;
}

retryCheckin().catch(err => {
  console.error(err);
  process.exit(1);
});
