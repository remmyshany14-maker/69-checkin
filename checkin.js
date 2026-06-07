const domain = "https://69yun69.com";

const user = process.env.USER_EMAIL;
const pass = process.env.USER_PASSWORD;

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const toEmail = process.env.TO_EMAIL;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// fetch 超时保护
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
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
  const startTime = Date.now();

  console.log("开始签到");

  // 登录
  const loginResponse = await fetchWithTimeout(
    `${domain}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest"
      },
      body:
        `email=${encodeURIComponent(user)}` +
        `&passwd=${encodeURIComponent(pass)}` +
        `&remember_me=on&code=`
    }
  );

  const loginJson = await loginResponse.json();

  console.log("登录结果:", loginJson);

  if (loginJson.ret !== 1) {
    throw new Error(
      `登录失败：${JSON.stringify(loginJson)}`
    );
  }

  // 获取 Cookie
  const rawCookies = loginResponse.headers.get("set-cookie");

  if (!rawCookies) {
    throw new Error("获取 Cookie 失败");
  }

  const cookies = rawCookies
    .split(/,(?=\s\w+=)/)
    .map(c => c.split(";")[0])
    .join("; ");

  // 签到
  const checkinResponse = await fetchWithTimeout(
    `${domain}/user/checkin`,
    {
      method: "POST",
      headers: {
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest"
      }
    }
  );

  const result = await checkinResponse.json();

  console.log("签到结果:", result);

  const msg = result.msg || "无返回内容";

  const duration =
    ((Date.now() - startTime) / 1000).toFixed(2);

  let subject = "";
  let status = "";

  if (result.ret === 1) {
    subject = "✅ 69云签到成功";
    status = "✅ 今日签到成功";
  } else if (
    msg.includes("已经") ||
    msg.includes("已签到")
  ) {
    subject = "ℹ️ 69云今日已签到";
    status = "ℹ️ 今日已经签到";
  } else {
    subject = "⚠️ 69云签到异常";
    status = "⚠️ 签到返回异常";
  }

  const emailText = `
📌 69云签到结果

状态：
${status}

返回信息：
${msg}

运行耗时：
${duration} 秒

原始返回：
${JSON.stringify(result, null, 2)}

执行时间：
${new Date().toLocaleString()}

========================
GitHub Actions 自动执行
========================
`;

  await sendMail(subject, emailText);

  return result;
}

async function retryCheckin() {
  const maxRetry = 3;

  let lastError = null;

  for (let i = 1; i <= maxRetry; i++) {
    try {
      console.log(`第 ${i} 次尝试`);

      await checkin();

      return;
    } catch (err) {
      console.log(`失败: ${err.message}`);

      lastError = err;

      if (i < maxRetry) {
        console.log("5秒后重试...");
        await sleep(5000);
      }
    }
  }

  // 最终失败邮件
  const emailText = `
📌 69云签到最终失败

已重试 ${maxRetry} 次

错误信息：
${lastError?.message || "未知错误"}

执行时间：
${new Date().toLocaleString()}

========================
GitHub Actions 自动执行
========================
`;

  await sendMail(
    "❌ 69云签到失败",
    emailText
  );

  throw lastError;
}

retryCheckin().catch(err => {
  console.error(err);
  process.exit(1);
});
