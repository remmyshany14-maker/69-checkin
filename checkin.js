const domain = "https://69yun69.com";

const user = process.env.USER_EMAIL;
const pass = process.env.USER_PASSWORD;

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

  console.log(loginJson);

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

  console.log("签到结果:");
  console.log(result);

}

checkin().catch(err => {
  console.error(err);
  process.exit(1);
});
